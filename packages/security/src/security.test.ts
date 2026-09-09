import { describe, expect, it, beforeAll } from "vitest";
import { checkPasswordPolicy, hashPassword, verifyPassword } from "./password";
import {
  base32Decode,
  base32Encode,
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  totpCode,
  totpUri,
  verifyTotp,
} from "./totp";
import {
  createToken,
  hashToken,
  throttleDelayMs,
  tokenMatches,
} from "./tokens";
import { checkBreachedPassword } from "./breach";

beforeAll(() => {
  process.env.AUTH_ENCRYPTION_KEY = "test-encryption-key-0123456789";
});

describe("비밀번호", () => {
  it("해시는 원문을 담지 않고 검증은 통과한다", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct");
    expect(hash.startsWith("scrypt$32768$8$1$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(
      true,
    );
    expect(await verifyPassword("wrong password value", hash)).toBe(false);
  });

  it("망가진 해시 문자열은 조용히 통과시키지 않는다", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "argon2$x$y$z$a$b")).toBe(false);
  });

  it("12자 미만과 현재 비밀번호 재사용을 막는다", () => {
    expect(checkPasswordPolicy("short").ok).toBe(false);
    expect(checkPasswordPolicy("same-password-1", "same-password-1").ok).toBe(
      false,
    );
    expect(checkPasswordPolicy("a-long-enough-password").ok).toBe(true);
  });
});

describe("TOTP", () => {
  it("base32 왕복이 보존된다", () => {
    const buffer = Buffer.from([0, 1, 2, 250, 255, 128, 64]);
    expect(base32Decode(base32Encode(buffer)).equals(buffer)).toBe(true);
  });

  it("RFC 6238 SHA-1 테스트 벡터와 일치한다", () => {
    // RFC 6238 Appendix B: seed "12345678901234567890", T=59 → 94287082
    const secret = base32Encode(Buffer.from("12345678901234567890", "ascii"));
    expect(totpCode(secret, 59_000)).toBe("287082");
    expect(totpCode(secret, 1_111_111_109_000)).toBe("081804");
  });

  it("±30초 표류를 허용하고 그 밖은 거부한다", () => {
    const secret = generateTotpSecret();
    const now = 1_760_000_000_000;
    expect(verifyTotp(secret, totpCode(secret, now), now)).toBe(true);
    expect(verifyTotp(secret, totpCode(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totpCode(secret, now - 300_000), now)).toBe(
      false,
    );
    expect(verifyTotp(secret, "12345", now)).toBe(false);
    expect(verifyTotp(secret, "abcdef", now)).toBe(false);
  });

  it("secret 암호화 왕복이 되고 암호문에 평문이 없다", () => {
    const secret = generateTotpSecret();
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("otpauth URI 에 issuer 와 digits 가 실린다", () => {
    const uri = totpUri({
      secret: "ABCD",
      email: "a@b.c",
      issuer: "뭐해야집사냐",
    });
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain("digits=6");
  });
});

describe("토큰", () => {
  it("DB 에는 해시만 남고 원 토큰으로 검증된다", () => {
    const { token, hash } = createToken();
    expect(hash).not.toContain(token);
    expect(hash).toHaveLength(64);
    expect(tokenMatches(token, hash)).toBe(true);
    expect(tokenMatches("other", hash)).toBe(false);
    expect(hashToken(token)).toBe(hash);
  });

  it("점진 제한은 3회부터 켜지고 15분에서 멈춘다", () => {
    expect(throttleDelayMs(0)).toBe(0);
    expect(throttleDelayMs(2)).toBe(0);
    expect(throttleDelayMs(3)).toBe(5000);
    expect(throttleDelayMs(4)).toBe(10000);
    expect(throttleDelayMs(50)).toBe(900_000);
  });
});

describe("유출 비밀번호 검사", () => {
  it("prefix 5자만 보내고 전체 해시·원문은 보내지 않는다", async () => {
    delete process.env.PASSWORD_BREACH_CHECK;
    let requested = "";
    const result = await checkBreachedPassword("password", {
      fetchImpl: (async (input: string | URL) => {
        requested = String(input);
        // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
        return new Response("1E4C9B93F3F0682250B6CF8331B7EE68FD8:37359195\n", {
          status: 200,
        });
      }) as unknown as typeof fetch,
    });
    expect(requested.endsWith("/5BAA6")).toBe(true);
    // 엔드포인트 이름에 "password" 가 들어 있으므로, 실제로 전송된 것은 경로의 **끝 조각**뿐임을 본다.
    const sent = requested.split("/range/")[1]!;
    expect(sent).toBe("5BAA6");
    expect(sent).not.toContain("password");
    expect(result).toEqual({ status: "breached", count: 37359195 });
  });

  it("조회 실패는 통과가 아니라 보류다", async () => {
    delete process.env.PASSWORD_BREACH_CHECK;
    const result = await checkBreachedPassword("whatever-long-password", {
      fetchImpl: (async () => {
        throw new Error("network down");
      }) as unknown as typeof fetch,
    });
    expect(result.status).toBe("unavailable");
  });
});
