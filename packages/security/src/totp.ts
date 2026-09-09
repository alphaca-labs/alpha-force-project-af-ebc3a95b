import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

/**
 * RFC 6238 TOTP (SHA-1, 6자리, 30초). 운영자 추가 인증 전용이다.
 * 외부 의존성 없이 `node:crypto` 만 쓴다.
 */
const DIGITS = 6;
const PERIOD = 30;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(byteLength = 20): string {
  return base32Encode(randomBytes(byteLength));
}

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/u, "").replace(/\s/gu, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error("base32 문자가 아닙니다.");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function totpCode(secret: string, atMs: number = Date.now()): string {
  const counter = Math.floor(atMs / 1000 / PERIOD);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", base32Decode(secret))
    .update(buffer)
    .digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/**
 * 코드 검증. 서버 시각 기준으로 ±1 스텝(±30초)까지 허용한다.
 * 비교는 상수 시간으로 한다.
 */
export function verifyTotp(
  secret: string,
  code: string,
  atMs: number = Date.now(),
): boolean {
  const candidate = code.replace(/\s/gu, "");
  if (!/^\d{6}$/u.test(candidate)) return false;
  for (const drift of [-1, 0, 1]) {
    const expected = totpCode(secret, atMs + drift * PERIOD * 1000);
    if (
      expected.length === candidate.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(candidate))
    ) {
      return true;
    }
  }
  return false;
}

export function totpUri(input: {
  secret: string;
  email: string;
  issuer: string;
}): string {
  const label = encodeURIComponent(`${input.issuer}:${input.email}`);
  const params = new URLSearchParams({
    secret: input.secret,
    issuer: input.issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * TOTP secret 저장 암호화. `AUTH_ENCRYPTION_KEY` 를 scrypt 로 늘여 AES-256-GCM 키로 쓴다.
 * 평문 secret 은 DB 에도 로그에도 남기지 않는다.
 */
function encryptionKey(): Buffer {
  const raw = process.env.AUTH_ENCRYPTION_KEY;
  if (!raw || raw.length < 16) {
    throw new Error("AUTH_ENCRYPTION_KEY 가 필요합니다(16자 이상).");
  }
  return scryptSync(raw, "zipsanya.totp.v1", 32);
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptSecret(stored: string): string {
  const [ivText, tagText, dataText] = stored.split(":");
  if (!ivText || !tagText || !dataText)
    throw new Error("암호문 형식이 올바르지 않습니다.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivText, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataText, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
