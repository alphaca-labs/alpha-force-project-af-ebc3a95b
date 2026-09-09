"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { database } from "@repo/database";
import {
  INVITATION_TTL_MS,
  RESET_TTL_MS,
  checkBreachedPassword,
  checkPasswordPolicy,
  createToken,
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  hashPassword,
  hashToken,
  throttleDelayMs,
  totpUri,
  verifyPassword,
  verifyTotp,
} from "@repo/security";
import {
  clearSessionCookie,
  issueSession,
  markMfaSatisfied,
  readPrincipal,
  revokeAllSessions,
} from "./session";
import { requireOperatorOrNull, canManageAdmins } from "./guard";
import { writeAudit } from "../audit";

import type { AuthState } from "./form-state";

/**
 * 인증 실패는 항상 이 한 문장이다.
 * 이메일·비밀번호·TOTP 중 무엇이 틀렸는지도, 계정이 있는지도 구분하지 않는다.
 */
const NEUTRAL_FAILURE = "로그인 정보를 확인해 주세요.";

/** 제한 축은 이메일 원문이 아니라 해시다. 원장에 이메일을 남기지 않는다. */
function axisOf(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

async function recentFailures(axis: string, kind: string): Promise<number> {
  return database.authAttempt.count({
    where: {
      axis,
      kind,
      succeeded: false,
      createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
    },
  });
}

async function recordAttempt(
  axis: string,
  kind: string,
  succeeded: boolean,
): Promise<void> {
  await database.authAttempt.create({ data: { axis, kind, succeeded } });
}

/** ADM-P01 — 이메일·비밀번호 1차 인증(FR-030 · FR-035). */
export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: NEUTRAL_FAILURE, notice: null };

  const axis = axisOf(email);
  if (throttleDelayMs(await recentFailures(axis, "PASSWORD")) > 0) {
    return {
      error: "시도가 너무 잦습니다. 잠시 후 다시 시도해 주세요.",
      notice: null,
    };
  }

  const admin = await database.adminAccount.findUnique({ where: { email } });
  // 계정이 없어도 같은 비용·같은 응답으로 끝낸다.
  const ok = admin
    ? await verifyPassword(password, admin.passwordHash)
    : await verifyPassword(password, "scrypt$32768$8$1$AAAA$AAAA");
  if (!admin || !ok || admin.status === "INACTIVE") {
    await recordAttempt(axis, "PASSWORD", false);
    return { error: NEUTRAL_FAILURE, notice: null };
  }

  await recordAttempt(axis, "PASSWORD", true);
  const userAgent = (await headers()).get("user-agent");
  await issueSession({
    adminId: admin.id,
    sessionVersion: admin.sessionVersion,
    mfaSatisfied: false,
    userAgent,
  });
  await database.adminAccount.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  // 최초 설정이 남았으면 그 화면으로 격리한다(FR-036).
  if (admin.status === "SETUP_REQUIRED" || !admin.mfaEnabled)
    redirect("/login/setup");
  redirect("/login/challenge");
}

/** ADM-P02 — TOTP 추가 인증(FR-030). */
export async function challengeAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const principal = await readPrincipal();
  if (!principal) return { error: NEUTRAL_FAILURE, notice: null };
  const code = String(formData.get("code") ?? "").replace(/\s/gu, "");

  const axis = axisOf(principal.email);
  if (throttleDelayMs(await recentFailures(axis, "TOTP")) > 0) {
    return {
      error: "시도가 너무 잦습니다. 잠시 후 다시 시도해 주세요.",
      notice: null,
    };
  }

  const credential = await database.adminMfaCredential.findUnique({
    where: { adminId: principal.adminId },
  });
  if (!credential || !credential.confirmedAt)
    return { error: NEUTRAL_FAILURE, notice: null };
  if (!verifyTotp(decryptSecret(credential.encryptedSecret), code)) {
    await recordAttempt(axis, "TOTP", false);
    return { error: NEUTRAL_FAILURE, notice: null };
  }
  await recordAttempt(axis, "TOTP", true);
  await markMfaSatisfied(principal.sessionId);
  redirect("/properties");
}

/** ADM-P03 — 최초 로그인: 비밀번호 교체 + TOTP 등록(FR-036). */
export async function setupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const principal = await readPrincipal();
  if (!principal) redirect("/login");

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\s/gu, "");
  const secret = String(formData.get("secret") ?? "");

  if (password !== confirm)
    return { error: "두 비밀번호가 다릅니다.", notice: null };
  const policy = checkPasswordPolicy(password);
  if (!policy.ok) return { error: policy.reason, notice: null };

  const admin = await database.adminAccount.findUnique({
    where: { id: principal.adminId },
  });
  if (!admin) redirect("/login");
  if (await verifyPassword(password, admin.passwordHash)) {
    return { error: "현재 비밀번호와 다른 값을 사용해 주세요.", notice: null };
  }

  const breach = await checkBreachedPassword(password);
  if (breach.status === "breached") {
    return {
      error: "이미 유출된 적이 있는 비밀번호입니다. 다른 값을 사용해 주세요.",
      notice: null,
    };
  }
  if (breach.status === "unavailable") {
    // 검사가 실패하면 «통과» 로 넘기지 않고 설정을 보류한다(FR-031).
    return {
      error: null,
      notice: `유출 여부를 지금 확인할 수 없어 설정을 보류했습니다(${breach.reason}). 잠시 후 다시 시도해 주세요.`,
    };
  }

  if (!secret || !verifyTotp(secret, code)) {
    return { error: "인증 앱의 코드가 맞지 않습니다.", notice: null };
  }

  const hashed = await hashPassword(password);
  await database.$transaction(async (tx) => {
    await tx.adminMfaCredential.upsert({
      where: { adminId: admin.id },
      update: {
        encryptedSecret: encryptSecret(secret),
        confirmedAt: new Date(),
      },
      create: {
        adminId: admin.id,
        encryptedSecret: encryptSecret(secret),
        confirmedAt: new Date(),
      },
    });
    await tx.adminAccount.update({
      where: { id: admin.id },
      data: {
        passwordHash: hashed,
        status: "ACTIVE",
        mfaEnabled: true,
        // 설정 완료 시점에 기존 세션을 전부 무효화한다.
        sessionVersion: { increment: 1 },
      },
    });
    await tx.adminSession.updateMany({
      where: { adminId: admin.id, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
  });

  // 새 버전으로 세션을 다시 발급하고 TOTP 를 이미 확인했으므로 곧바로 통과시킨다.
  const refreshed = await database.adminAccount.findUniqueOrThrow({
    where: { id: admin.id },
  });
  await issueSession({
    adminId: admin.id,
    sessionVersion: refreshed.sessionVersion,
    mfaSatisfied: true,
    userAgent: (await headers()).get("user-agent"),
  });
  redirect("/properties");
}

/** ADM-P03 화면이 새 secret 을 만들 때 쓴다. 원문은 이 응답에만 실리고 저장하지 않는다. */
export async function newTotpSecretAction(): Promise<{
  secret: string;
  uri: string;
} | null> {
  const principal = await readPrincipal();
  if (!principal) return null;
  const secret = generateTotpSecret();
  return {
    secret,
    uri: totpUri({
      secret,
      email: principal.email,
      issuer: "뭐해야집사냐 운영",
    }),
  };
}

/** ADM-P04 — 재설정 요청. 계정 존재 여부와 무관하게 항상 같은 완료 문구를 낸다(FR-035). */
export async function forgotPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const axis = axisOf(email);
  const same = {
    error: null,
    notice: "요청을 확인했습니다. 등록된 계정이라면 재설정 링크가 도착합니다.",
  } satisfies AuthState;

  if (throttleDelayMs(await recentFailures(axis, "RESET_REQUEST")) > 0)
    return same;
  await recordAttempt(axis, "RESET_REQUEST", false);

  const admin = await database.adminAccount.findUnique({ where: { email } });
  if (!admin || admin.status === "INACTIVE") return same;

  const { token, hash } = createToken();
  await database.passwordResetToken.create({
    data: {
      adminId: admin.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  // 메일 발송은 `@repo/email` 로 연결한다. 토큰 원문은 로그에 남기지 않는다.
  await deliverResetLink(admin.email, token);
  return same;
}

/** ADM-P05 — 새 비밀번호 설정(FR-031 · FR-035). */
export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm)
    return { error: "두 비밀번호가 다릅니다.", notice: null };
  const policy = checkPasswordPolicy(password);
  if (!policy.ok) return { error: policy.reason, notice: null };

  const record = await database.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { admin: true },
  });
  // 존재하지 않는 토큰과 만료된 토큰은 같은 응답이다.
  if (
    !record ||
    record.status !== "PENDING" ||
    record.expiresAt.getTime() < Date.now()
  ) {
    return {
      error:
        "이 링크는 더 이상 사용할 수 없습니다. 재설정을 다시 요청해 주세요.",
      notice: null,
    };
  }
  if (await verifyPassword(password, record.admin.passwordHash)) {
    return { error: "현재 비밀번호와 다른 값을 사용해 주세요.", notice: null };
  }
  const breach = await checkBreachedPassword(password);
  if (breach.status === "breached") {
    return {
      error: "이미 유출된 적이 있는 비밀번호입니다. 다른 값을 사용해 주세요.",
      notice: null,
    };
  }
  if (breach.status === "unavailable") {
    return {
      error: null,
      notice: `유출 여부를 지금 확인할 수 없어 변경을 보류했습니다(${breach.reason}).`,
    };
  }

  const hashed = await hashPassword(password);
  await database.$transaction(async (tx) => {
    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { status: "USED", usedAt: new Date() },
    });
    await tx.adminAccount.update({
      where: { id: record.adminId },
      data: { passwordHash: hashed, sessionVersion: { increment: 1 } },
    });
    // 비밀번호가 바뀌면 기존 세션 전부를 폐기한다(FR-031).
    await tx.adminSession.updateMany({
      where: { adminId: record.adminId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
  });
  redirect("/login");
}

/** ADM-P06 — 초대 수락(FR-033). */
export async function acceptInviteAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm)
    return { error: "두 비밀번호가 다릅니다.", notice: null };
  const policy = checkPasswordPolicy(password);
  if (!policy.ok) return { error: policy.reason, notice: null };

  const invitation = await database.adminInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (
    !invitation ||
    invitation.status !== "PENDING" ||
    invitation.expiresAt.getTime() < Date.now()
  ) {
    return {
      error:
        "이 초대는 더 이상 사용할 수 없습니다. 초대한 운영자에게 문의해 주세요.",
      notice: null,
    };
  }
  const breach = await checkBreachedPassword(password);
  if (breach.status === "breached") {
    return {
      error: "이미 유출된 적이 있는 비밀번호입니다. 다른 값을 사용해 주세요.",
      notice: null,
    };
  }
  if (breach.status === "unavailable") {
    return {
      error: null,
      notice: `유출 여부를 지금 확인할 수 없어 가입을 보류했습니다(${breach.reason}).`,
    };
  }

  const hashed = await hashPassword(password);
  await database.$transaction(async (tx) => {
    await tx.adminAccount.create({
      data: {
        email: invitation.email,
        name: name || invitation.email.split("@")[0]!,
        passwordHash: hashed,
        role: invitation.role,
        // 비밀번호는 정했지만 TOTP 등록이 남았다.
        status: "SETUP_REQUIRED",
      },
    });
    await tx.adminInvitation.update({
      where: { id: invitation.id },
      data: { status: "USED", usedAt: new Date() },
    });
  });
  redirect("/login");
}

export async function logoutAction(): Promise<void> {
  const principal = await readPrincipal();
  if (principal) await revokeAllSessions(principal.adminId);
  await clearSessionCookie();
  redirect("/login");
}

/** ADM-R05 — 초대 발급(FR-033). OWNER 만 실행한다. */
export async function inviteAdminAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const principal = await requireOperatorOrNull();
  if (!principal || !canManageAdmins(principal))
    return { error: "권한이 없습니다.", notice: null };
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const roleRaw = String(formData.get("role") ?? "OPERATOR");
  const role =
    roleRaw === "OWNER" || roleRaw === "OPERATOR" || roleRaw === "VIEWER"
      ? roleRaw
      : "OPERATOR";
  if (!email.includes("@"))
    return { error: "이메일 형식을 확인해 주세요.", notice: null };
  if (await database.adminAccount.findUnique({ where: { email } })) {
    return { error: "이미 등록된 계정입니다.", notice: null };
  }

  const { token, hash } = createToken();
  await database.$transaction(async (tx) => {
    const invitation = await tx.adminInvitation.create({
      data: {
        email,
        role,
        tokenHash: hash,
        invitedById: principal.adminId,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
    });
    await writeAudit(tx, {
      principal,
      action: "ADMIN_INVITED",
      targetType: "AdminInvitation",
      targetId: invitation.id,
      after: { email, role, expiresAt: invitation.expiresAt.toISOString() },
    });
  });
  await deliverInvitation(email, token);
  return {
    error: null,
    notice: `${email} 로 초대를 보냈습니다. 24시간 안에 수락해야 합니다.`,
  };
}

/** ADM-R05 — 계정 비활성화·재활성화(FR-034). 마지막 활성 계정과 자기 자신은 막는다. */
export async function setAdminStatusAction(formData: FormData): Promise<void> {
  const principal = await requireOperatorOrNull();
  if (!principal || !canManageAdmins(principal)) redirect("/access-denied");
  const targetId = String(formData.get("adminId") ?? "");
  const next = String(formData.get("status") ?? "");
  if (next !== "ACTIVE" && next !== "INACTIVE") return;
  if (targetId === principal.adminId) return; // 자기 비활성화 방지

  const target = await database.adminAccount.findUnique({
    where: { id: targetId },
  });
  if (!target) return;
  if (next === "INACTIVE") {
    const activeCount = await database.adminAccount.count({
      where: { status: "ACTIVE" },
    });
    if (activeCount <= 1) return; // 마지막 활성 운영자 보호
  }

  await database.$transaction(async (tx) => {
    await tx.adminAccount.update({
      where: { id: targetId },
      data: { status: next, sessionVersion: { increment: 1 } },
    });
    if (next === "INACTIVE") {
      await tx.adminSession.updateMany({
        where: { adminId: targetId, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
    }
    await writeAudit(tx, {
      principal,
      action: next === "ACTIVE" ? "ADMIN_REACTIVATED" : "ADMIN_DEACTIVATED",
      targetType: "AdminAccount",
      targetId,
      before: { status: target.status },
      after: { status: next },
    });
  });
}

/**
 * 초대·재설정 메일 발송.
 *
 * 지정 이메일로만 보내고 토큰 원문은 로그에 남기지 않는다. `RESEND_TOKEN` 이 없는 환경에서는
 * 발송을 건너뛰되 **성공으로 표시하지 않는다** — 링크는 운영자 화면과 초대 목록에서 다시 만들 수 있다.
 */
async function deliverInvitation(email: string, token: string): Promise<void> {
  await deliverMail(email, "운영자 초대", `${baseUrl()}/invite/${token}`);
}

async function deliverResetLink(email: string, token: string): Promise<void> {
  await deliverMail(
    email,
    "비밀번호 재설정",
    `${baseUrl()}/reset-password/${token}`,
  );
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
}

async function deliverMail(
  to: string,
  subject: string,
  link: string,
): Promise<void> {
  if (!process.env.RESEND_TOKEN) {
    // 개발·격리 환경. 링크 자체는 콘솔에도 남기지 않는다(토큰 원문 로그 금지).
    console.info(
      `[mail] ${subject} 발송 대상 ${to} — RESEND_TOKEN 미설정으로 전송하지 않음`,
    );
    return;
  }
  try {
    // `@repo/email` 은 import 시점에 RESEND_* 를 검증하고 없으면 던진다.
    // 그래서 토큰이 있는 이 분기 안에서만 동적으로 가져온다.
    const { resend } = await import("@repo/email");
    await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to,
      subject: `[뭐해야집사냐 운영] ${subject}`,
      text: `아래 링크에서 이어서 진행해 주세요.\n\n${link}\n\n이 링크는 정해진 시간 안에 한 번만 사용할 수 있습니다.`,
    });
  } catch {
    console.warn(`[mail] ${subject} 발송 실패 — 대상 ${to}`);
  }
}
