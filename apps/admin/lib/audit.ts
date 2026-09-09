import "server-only";
import { randomUUID } from "node:crypto";
import { database } from "@repo/database";
import type { AdminPrincipal } from "./auth/session";

/**
 * FR-029 — 감사 기록.
 *
 * 제품 변경과 감사 기록은 **한 트랜잭션**에서 함께 성공해야 한다. 감사 기록이 실패하면
 * 제품 변경도 되돌린다. 그래서 이 함수는 트랜잭션 클라이언트를 인자로 받는다.
 *
 * 비밀번호 해시·토큰·TOTP secret 은 before/after 어디에도 넣지 않는다.
 */
type Tx = Parameters<Parameters<typeof database.$transaction>[0]>[0];

export async function writeAudit(
  tx: Tx,
  input: {
    readonly principal: AdminPrincipal;
    readonly action: string;
    readonly targetType: string;
    readonly targetId: string;
    readonly before?: unknown;
    readonly after?: unknown;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      adminId: input.principal.adminId,
      actorEmail: input.principal.email,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      before: (input.before ?? null) as never,
      after: (input.after ?? null) as never,
      requestId: randomUUID(),
    },
  });
}
