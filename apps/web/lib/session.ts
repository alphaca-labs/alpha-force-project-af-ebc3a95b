import "server-only";
import { cookies } from "next/headers";
import {
  EMPTY_HOUSEHOLD,
  financeSchema,
  householdSchema,
  type FinanceValues,
  type HouseholdValues,
} from "@repo/domain";
import { z } from "zod";

/**
 * 시뮬레이션 세션.
 *
 * 고객은 로그인하지 않으므로 선택한 평형과 재무 입력은 이 기기의 쿠키에만 담는다.
 * 계정 데이터가 아니고, 성명·주민번호·금융기관 인증정보는 애초에 받지 않는다(FR-004 규칙).
 */
export const SESSION_COOKIE = "zipsanya.session";

export const sessionSchema = z.object({
  areaId: z.string().min(1),
  finance: financeSchema.nullable(),
  household: householdSchema,
});

export type SimulationSession = z.infer<typeof sessionSchema>;

export async function readSession(): Promise<SimulationSession | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return sessionSchema.parse(JSON.parse(raw));
  } catch {
    // 손상된 쿠키는 조용히 버린다. 화면은 처음 상태로 되돌아간다.
    return null;
  }
}

export async function writeSession(session: SimulationSession): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
}

export function newSession(
  areaId: string,
  finance: FinanceValues | null = null,
  household: HouseholdValues = EMPTY_HOUSEHOLD,
): SimulationSession {
  return { areaId, finance, household };
}
