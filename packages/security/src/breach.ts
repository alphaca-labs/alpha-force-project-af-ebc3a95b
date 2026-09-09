import { createHash } from "node:crypto";

/**
 * FR-031 — 유출 비밀번호 검사.
 *
 * raw password 와 전체 해시를 외부로 보내지 않는다. SHA-1 해시의 **앞 5자**만 질의하고
 * 나머지 35자는 로컬에서 대조하는 k-anonymity 방식이다(HIBP Pwned Passwords Range API).
 *
 * 네트워크를 쓸 수 없거나 응답이 실패하면 «통과» 로 넘기지 않고 **설정을 보류**한다.
 * 호출자는 `status === "unavailable"` 을 사용자에게 «지금은 확인할 수 없다» 로 알려야 한다.
 */
export type BreachCheck =
  | { readonly status: "clean" }
  | { readonly status: "breached"; readonly count: number }
  | { readonly status: "unavailable"; readonly reason: string };

const ENDPOINT = "https://api.pwnedpasswords.com/range";

export async function checkBreachedPassword(
  password: string,
  options: {
    readonly timeoutMs?: number;
    readonly fetchImpl?: typeof fetch;
  } = {},
): Promise<BreachCheck> {
  // 검사기를 끄고 싶은 격리 환경(오프라인 CI·스모크)은 명시적으로 꺼야 한다.
  // 값이 없으면 «검사한다» 가 기본이고, 실패는 통과가 아니라 보류다.
  if (process.env.PASSWORD_BREACH_CHECK === "off") {
    return {
      status: "unavailable",
      reason: "유출 검사가 비활성화된 환경입니다.",
    };
  }
  const sha1 = createHash("sha1")
    .update(password, "utf8")
    .digest("hex")
    .toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 3000);
  try {
    const response = await doFetch(`${ENDPOINT}/${prefix}`, {
      signal: controller.signal,
      headers: { "Add-Padding": "true" },
    });
    if (!response.ok)
      return { status: "unavailable", reason: `조회 응답 ${response.status}` };
    const body = await response.text();
    for (const line of body.split("\n")) {
      const [hashSuffix, countText] = line.trim().split(":");
      if (hashSuffix === suffix) {
        const count = Number(countText);
        // padding 응답은 count 0 으로 온다 — 실제 유출이 아니다.
        if (count > 0) return { status: "breached", count };
      }
    }
    return { status: "clean" };
  } catch (error) {
    return {
      status: "unavailable",
      reason: error instanceof Error ? error.message : "조회 실패",
    };
  } finally {
    clearTimeout(timer);
  }
}
