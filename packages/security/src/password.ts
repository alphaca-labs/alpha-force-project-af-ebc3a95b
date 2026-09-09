import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * 비밀번호 해시.
 *
 * PRD 는 Argon2id 를 지목한다. Node 표준 라이브러리에는 Argon2 가 없고, 이 저장소는
 * 네이티브 빌드가 필요한 의존성을 새로 들이지 않는 것이 배포 제약이라 **scrypt(N=2^15,
 * r=8, p=1, 64B)** 로 구현했다. scrypt 는 메모리 하드 KDF 로 같은 위협 모델(오프라인
 * 사전 공격)을 겨냥하며 RFC 7914 표준이다.
 *
 * 해시 문자열은 알고리즘·파라미터를 스스로 담는다(`scrypt$N$r$p$salt$key`). 나중에
 * Argon2id 로 옮길 때 이 접두로 구분해 무중단 마이그레이션할 수 있다.
 */
const N = 32768;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 96 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p))
    return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4]!, "base64");
    expected = Buffer.from(parts[5]!, "base64");
  } catch {
    return false;
  }
  const actual = await scrypt(password, salt, expected.length, {
    N: n,
    r,
    p,
    maxmem: MAXMEM,
  });
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** 비밀번호 정책(FR-031): 12자 이상, 현재 비밀번호와 다름, 유출 확인 통과. */
export const PASSWORD_MIN_LENGTH = 12;

export type PasswordPolicyResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export function checkPasswordPolicy(
  password: string,
  currentPassword?: string,
): PasswordPolicyResult {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      reason: `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
    };
  }
  if (currentPassword && password === currentPassword) {
    return { ok: false, reason: "현재 비밀번호와 다른 값을 사용해 주세요." };
  }
  return { ok: true };
}
