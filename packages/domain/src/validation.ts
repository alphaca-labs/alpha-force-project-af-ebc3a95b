import { z } from "zod";

/** 원 단위 금액. 0 이상, 999,999,999,999 이하(FR-005). */
export const wonSchema = z
  .number({ error: "금액을 숫자로 입력해 주세요." })
  .int("원 단위 정수로 입력해 주세요.")
  .min(0, "0원 이상으로 입력해 주세요.")
  .max(999_999_999_999, "999,999,999,999원 이하로 입력해 주세요.");

/** FR-004 · FR-005 — 재무 입력. 소득·저축 0원은 허용한다. */
export const financeSchema = z.object({
  assets: wonSchema,
  annualIncome: wonSchema,
  monthlySaving: wonSchema,
  existingLoanBalance: wonSchema,
  existingAnnualRepayment: wonSchema,
});

/** FR-015 — 선택 가구 조건. 미입력은 null 이며 임의로 적격 추정하지 않는다. */
export const householdSchema = z.object({
  noHome: z.boolean().nullable(),
  firstTime: z.boolean().nullable(),
  maritalStatus: z.enum(["SINGLE", "MARRIED"]).nullable(),
  marriageMonths: z.number().int().min(0).max(1200).nullable(),
  householdSize: z.number().int().min(1).max(20).nullable(),
  dependents: z.number().int().min(0).max(20).nullable(),
  age: z.number().int().min(0).max(120).nullable(),
});

/** FR-002 — 검색어는 2자 이상 20자 이하. */
export const searchQuerySchema = z
  .string()
  .trim()
  .min(2, "2자 이상 입력해 주세요.")
  .max(20, "20자 이하로 입력해 주세요.");

export type FinanceValues = z.infer<typeof financeSchema>;
export type HouseholdValues = z.infer<typeof householdSchema>;

export const EMPTY_HOUSEHOLD: HouseholdValues = {
  noHome: null,
  firstTime: null,
  maritalStatus: null,
  marriageMonths: null,
  householdSize: null,
  dependents: null,
  age: null,
};
