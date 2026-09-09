import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * 추측 불가능한 접근 토큰(FR-022.AC1 · FR-033 · FR-035).
 *
 * 원 토큰은 URL·메일에만 실리고 DB 에는 SHA-256 해시만 저장한다. 존재하지 않는 토큰과
 * 만료된 토큰은 같은 실패 상태로 붕괴시켜 존재 여부를 노출하지 않는다.
 */
export function createToken(byteLength = 32): {
  readonly token: string;
  readonly hash: string;
} {
  const token = randomBytes(byteLength).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function tokenMatches(token: string, storedHash: string): boolean {
  const actual = Buffer.from(hashToken(token));
  const expected = Buffer.from(storedHash);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** 세션 수명(FR-030 · 비기능). 서버 시각만 믿는다. */
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000;
/** 초대 만료(FR-033) */
export const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
/** 비밀번호 재설정 만료 */
export const RESET_TTL_MS = 60 * 60 * 1000;

/**
 * 반복 실패 점진 제한. 실패 n회 뒤 대기 시간(ms).
 * 0·1·2회는 즉시, 3회부터 2의 거듭제곱으로 늘리고 15분에서 멈춘다.
 */
export function throttleDelayMs(recentFailures: number): number {
  if (recentFailures < 3) return 0;
  return Math.min(2 ** (recentFailures - 3) * 5000, 15 * 60 * 1000);
}
