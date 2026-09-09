import { timingSafeEqual } from "node:crypto";
import { runIngestion } from "@/lib/ingestion";

export const dynamic = "force-dynamic";

/**
 * 시스템 전용 수집 실행 엔드포인트(FR-025).
 *
 * 관문은 **사람 로그인이 아니라 시스템 자격 증명**이다. 세션 쿠키가 없으므로
 * `proxy.ts` 의 공개 경로가 아니라 여기서 직접 판정한다. 검증보다 앞에 DB·외부 호출을
 * 두지 않는다.
 */
function authorized(request: Request): boolean {
  const expected = process.env.INGESTION_TOKEN;
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const result = await runIngestion({ cursor });
  return Response.json(result, {
    status: result.status === "SUCCEEDED" ? 200 : 202,
  });
}
