"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { database } from "@repo/database";
import { createToken, hashToken } from "@repo/security";
import {
  EMPTY_HOUSEHOLD,
  financeSchema,
  householdSchema,
  searchQuerySchema,
} from "@repo/domain";
import { readSession, writeSession, newSession } from "./session";
import { buildSimulation, sharePayload } from "./simulation";
import {
  searchProperties as searchInDb,
  type PropertySummary,
} from "./repository";

/** FR-002 — 검색. 2자 미만은 결과를 만들지 않는다. */
export async function searchAction(
  _prev: {
    properties: readonly PropertySummary[];
    error: string | null;
    query: string;
  },
  formData: FormData,
): Promise<{
  properties: readonly PropertySummary[];
  error: string | null;
  query: string;
}> {
  const raw = String(formData.get("query") ?? "");
  const type = String(formData.get("type") ?? "");
  const parsed = searchQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      properties: [],
      error: parsed.error.issues[0]?.message ?? "검색어를 확인해 주세요.",
      query: raw,
    };
  }
  const properties = await searchInDb(
    parsed.data,
    type === "APARTMENT" || type === "OFFICETEL" ? type : undefined,
  );
  return { properties, error: null, query: parsed.data };
}

/** FR-003 — 평형 선택 후 재무 입력으로 이동. */
export async function selectAreaAction(formData: FormData): Promise<void> {
  const areaId = String(formData.get("areaId") ?? "");
  if (!areaId) return;
  const current = await readSession();
  await writeSession(
    newSession(
      areaId,
      current?.finance ?? null,
      current?.household ?? EMPTY_HOUSEHOLD,
    ),
  );
  redirect("/finance");
}

export type FinanceFormState = {
  readonly errors: Record<string, string>;
  readonly summary: string | null;
};

/** FR-004 · FR-005 — 재무 입력 검증. 오류 요약과 필드별 오류를 함께 돌려준다. */
export async function submitFinanceAction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const session = await readSession();
  if (!session) return { errors: {}, summary: "목표 집을 먼저 선택해 주세요." };

  const numeric = (name: string): number | null => {
    const raw = String(formData.get(name) ?? "").replace(/[,\s]/gu, "");
    if (raw === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.round(value) : Number.NaN;
  };

  const fields = {
    assets: numeric("assets"),
    annualIncome: numeric("annualIncome"),
    monthlySaving: numeric("monthlySaving"),
    existingLoanBalance: numeric("existingLoanBalance") ?? 0,
    existingAnnualRepayment: numeric("existingAnnualRepayment") ?? 0,
  };

  const errors: Record<string, string> = {};
  for (const key of ["assets", "annualIncome", "monthlySaving"] as const) {
    if (fields[key] === null) errors[key] = "필수 항목입니다.";
  }
  const parsed = financeSchema.safeParse({
    assets: fields.assets ?? 0,
    annualIncome: fields.annualIncome ?? 0,
    monthlySaving: fields.monthlySaving ?? 0,
    existingLoanBalance: fields.existingLoanBalance,
    existingAnnualRepayment: fields.existingAnnualRepayment,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !errors[key]) errors[key] = issue.message;
    }
  }
  if (Object.keys(errors).length > 0) {
    return { errors, summary: "입력값을 다시 확인해 주세요." };
  }

  await writeSession({ ...session, finance: parsed.data! });
  redirect("/result");
}

/** FR-013 — 결과 화면의 조건 조정. 슬라이더·평형 전환이 같은 경로를 쓴다. */
export async function adjustAction(input: {
  readonly monthlySaving?: number;
  readonly annualIncome?: number;
  readonly areaId?: string;
}): Promise<{ readonly ok: boolean; readonly reason?: string }> {
  const session = await readSession();
  if (!session?.finance) return { ok: false, reason: "계산 기준이 없습니다." };
  const next = {
    ...session,
    areaId: input.areaId ?? session.areaId,
    finance: {
      ...session.finance,
      monthlySaving: input.monthlySaving ?? session.finance.monthlySaving,
      annualIncome: input.annualIncome ?? session.finance.annualIncome,
    },
  };
  const parsed = financeSchema.safeParse(next.finance);
  if (!parsed.success)
    return { ok: false, reason: "값의 범위를 확인해 주세요." };

  // 평형을 바꿨는데 그 평형 시세가 유효하지 않으면 기존 결과를 덮어쓰지 않는다(FR-013 Edge).
  const probe = await buildSimulation({ ...next, finance: parsed.data });
  if (!probe.ok) {
    return {
      ok: false,
      reason:
        probe.failure.kind === "PRICE_UNAVAILABLE"
          ? "선택한 평형의 시세를 확인할 수 없어 이전 결과를 유지했습니다."
          : "다시 계산할 수 없습니다.",
    };
  }
  await writeSession({ ...next, finance: parsed.data });
  revalidatePath("/result");
  revalidatePath("/roadmap");
  return { ok: true };
}

/** FR-015 — 선택 가구 조건 저장. 미입력은 null 로 유지해 임의 적격 추정을 막는다. */
export async function saveHouseholdAction(formData: FormData): Promise<void> {
  const session = await readSession();
  if (!session) redirect("/");
  const optionalBool = (name: string) => {
    const raw = String(formData.get(name) ?? "");
    if (raw === "yes") return true;
    if (raw === "no") return false;
    return null;
  };
  const optionalInt = (name: string) => {
    const raw = String(formData.get(name) ?? "").trim();
    if (raw === "") return null;
    const value = Number(raw);
    return Number.isInteger(value) ? value : null;
  };
  const maritalRaw = String(formData.get("maritalStatus") ?? "");
  const maritalStatus =
    maritalRaw === "SINGLE" || maritalRaw === "MARRIED" ? maritalRaw : null;
  const parsed = householdSchema.safeParse({
    noHome: optionalBool("noHome"),
    firstTime: optionalBool("firstTime"),
    maritalStatus,
    // 미혼이면 혼인 기간을 계산에서 제거한다(FR-015 Edge).
    marriageMonths:
      maritalStatus === "MARRIED" ? optionalInt("marriageMonths") : null,
    householdSize: optionalInt("householdSize"),
    dependents: optionalInt("dependents"),
    age: optionalInt("age"),
  });
  if (parsed.success)
    await writeSession({ ...session, household: parsed.data });
  redirect("/roadmap");
}

export type ShareResult =
  | { readonly ok: true; readonly url: string; readonly reused: boolean }
  | { readonly ok: false; readonly reason: string };

/**
 * FR-022 — 공유 URL 생성.
 *
 * 같은 지문이면 기존 URL 을 재사용한다. 원 토큰은 반환값에만 있고 DB 에는 해시만 남는다.
 * 그래서 재사용 판정은 «같은 지문의 스냅숏이 있는가» 로 하고, 그 스냅숏의 원 토큰은 다시
 * 복원할 수 없으므로 지문마다 토큰을 함께 보관하는 대신 **재사용 대상은 같은 세션이 만든
 * 스냅숏의 토큰**으로 한정한다(쿠키에 마지막 토큰을 둔다).
 */
export async function createShareAction(
  lastToken?: string,
): Promise<ShareResult> {
  const session = await readSession();
  const built = await buildSimulation(session);
  if (!built.ok) return { ok: false, reason: "공유할 결과가 없습니다." };

  const base = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

  if (lastToken) {
    const existing = await database.shareSnapshot.findUnique({
      where: { tokenHash: hashToken(lastToken) },
    });
    if (existing && existing.fingerprint === built.bundle.fingerprint) {
      return { ok: true, url: `${base}/share/${lastToken}`, reused: true };
    }
  }

  try {
    const { token, hash } = createToken();
    await database.shareSnapshot.create({
      data: {
        tokenHash: hash,
        fingerprint: built.bundle.fingerprint,
        payload: sharePayload(built.bundle) as never,
      },
    });
    return { ok: true, url: `${base}/share/${token}`, reused: false };
  } catch {
    // 불완전한 URL 을 돌려주지 않는다(FR-022 Edge).
    return {
      ok: false,
      reason: "공유 링크를 만들지 못했습니다. 다시 시도해 주세요.",
    };
  }
}

/** FR-024.AC2 — 공유 결과를 원본 그대로 두고 내 조건으로 새 시뮬레이션을 시작한다. */
export async function restartFromShareAction(): Promise<void> {
  redirect("/");
}
