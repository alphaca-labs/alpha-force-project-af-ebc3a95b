import "server-only";
import { cookies } from "next/headers";
import { database } from "@repo/database";
import { ADMIN_SESSION_COOKIE } from "./cookie";
import {
  SESSION_ABSOLUTE_MS,
  SESSION_IDLE_MS,
  createToken,
  hashToken,
} from "@repo/security";

/**
 * 운영자 세션 — DB 원장 + 쿠키 토큰.
 *
 * ⚠️ 여기서 JWT 로 «단순화» 하지 마라. PRD 는 아래 넷을 동시에 요구하고, 그중 셋은
 * 서버가 세션 행을 직접 읽어야만 성립한다.
 *   1. idle 30분 · absolute 12시간을 **서버 시각만** 믿고 판정
 *   2. 비밀번호·TOTP 변경·계정 비활성화 시 **관련 세션 전부** 즉시 폐기
 *   3. TOTP 를 마치기 전에는 관리 데이터 접근 0바이트 (`mfaSatisfied`)
 *   4. 역할은 요청 시점의 DB 값 (클라이언트가 보낸 역할명은 근거가 아니다)
 * JWT 는 발급 시점 스냅숏이라 2·4 를 조용히 놓친다 — 화면은 정상으로 보인다.
 */
export { ADMIN_SESSION_COOKIE } from "./cookie";

export type AdminPrincipal = {
  readonly sessionId: string;
  readonly adminId: string;
  readonly email: string;
  readonly name: string;
  readonly role: "OWNER" | "OPERATOR" | "VIEWER";
  readonly status: "SETUP_REQUIRED" | "ACTIVE" | "INACTIVE";
  readonly mfaSatisfied: boolean;
  readonly mfaEnabled: boolean;
};

export async function issueSession(input: {
  readonly adminId: string;
  readonly sessionVersion: number;
  readonly mfaSatisfied: boolean;
  readonly userAgent?: string | null;
}): Promise<void> {
  const { token, hash } = createToken();
  const now = Date.now();
  await database.adminSession.create({
    data: {
      adminId: input.adminId,
      tokenHash: hash,
      mfaSatisfied: input.mfaSatisfied,
      sessionVersion: input.sessionVersion,
      absoluteExpiresAt: new Date(now + SESSION_ABSOLUTE_MS),
      userAgent: input.userAgent ?? null,
    },
  });
  (await cookies()).set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * 현재 세션을 읽고 수명을 판정한다. 만료·폐기·버전 불일치는 전부 `null` 하나로 붕괴시킨다
 * (사유를 구분하면 사외 사용자가 계정 상태 오라클을 얻는다).
 */
export async function readPrincipal(): Promise<AdminPrincipal | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await database.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { admin: true },
  });
  if (!session || session.status !== "ACTIVE") return null;

  const now = Date.now();
  const idleDeadline = session.lastSeenAt.getTime() + SESSION_IDLE_MS;
  if (now > idleDeadline || now > session.absoluteExpiresAt.getTime()) {
    await database.adminSession.update({
      where: { id: session.id },
      data: { status: "EXPIRED" },
    });
    return null;
  }
  if (session.sessionVersion !== session.admin.sessionVersion) return null;
  if (session.admin.status === "INACTIVE") return null;

  // idle 시계는 서버 시각으로만 연장한다.
  await database.adminSession.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  return {
    sessionId: session.id,
    adminId: session.adminId,
    email: session.admin.email,
    name: session.admin.name,
    role: session.admin.role,
    status: session.admin.status,
    mfaSatisfied: session.mfaSatisfied,
    mfaEnabled: session.admin.mfaEnabled,
  };
}

export async function markMfaSatisfied(sessionId: string): Promise<void> {
  await database.adminSession.update({
    where: { id: sessionId },
    data: { mfaSatisfied: true },
  });
}

/** 로그아웃·비밀번호/TOTP 변경·계정 비활성화는 관련 세션 **전부**를 폐기한다. */
export async function revokeAllSessions(adminId: string): Promise<void> {
  await database.adminSession.updateMany({
    where: { adminId, status: "ACTIVE" },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
}
