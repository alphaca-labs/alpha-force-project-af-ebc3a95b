import type {
  ConditionEvaluation,
  EligibilityCondition,
  EligibilityStatus,
  FinanceInput,
  HouseholdInput,
  LoanProductRule,
  ProductAssessment,
} from "./types";

const FIELD_LABEL: Record<string, string> = {
  noHome: "무주택 여부",
  firstTime: "생애최초 여부",
  maritalStatus: "혼인 상태",
  marriageMonths: "혼인 기간",
  householdSize: "가구원 수",
  age: "연령",
};

function evaluateCondition(
  condition: EligibilityCondition,
  ctx: {
    finance: FinanceInput;
    household: HouseholdInput;
    targetPrice: number;
  },
): ConditionEvaluation {
  const { household, finance, targetPrice } = ctx;
  const unknown = (field: string): ConditionEvaluation => ({
    label: condition.label,
    verdict: "UNKNOWN",
    missingField: FIELD_LABEL[field] ?? field,
  });
  const decided = (met: boolean): ConditionEvaluation => ({
    label: condition.label,
    verdict: met ? "MET" : "UNMET",
    missingField: null,
  });

  switch (condition.kind) {
    case "NO_HOME":
      return household.noHome === null
        ? unknown("noHome")
        : decided(household.noHome);
    case "FIRST_TIME":
      return household.firstTime === null
        ? unknown("firstTime")
        : decided(household.firstTime);
    case "MAX_ANNUAL_INCOME":
      // 연소득은 필수 입력이라 항상 판정 가능하다.
      return decided(finance.annualIncome <= condition.value);
    case "MAX_PRICE":
      return decided(targetPrice <= condition.value);
    case "MAX_AGE":
      return household.age === null
        ? unknown("age")
        : decided(household.age <= condition.value);
    case "MIN_AGE":
      return household.age === null
        ? unknown("age")
        : decided(household.age >= condition.value);
    case "NEWLYWED_MONTHS": {
      if (household.maritalStatus === null) return unknown("maritalStatus");
      // 미혼이면 혼인 기간 값 자체를 계산에서 제거한다(FR-015 Edge).
      if (household.maritalStatus === "SINGLE") return decided(false);
      if (household.marriageMonths === null) return unknown("marriageMonths");
      return decided(household.marriageMonths <= condition.value);
    }
    case "MIN_HOUSEHOLD_SIZE":
      return household.householdSize === null
        ? unknown("householdSize")
        : decided(household.householdSize >= condition.value);
  }
}

function statusOf(
  conditions: readonly ConditionEvaluation[],
): EligibilityStatus {
  // 위반이 하나라도 있으면 부적격이 확정이다. 위반이 없고 미확인이 있으면 확인 필요.
  if (conditions.some((c) => c.verdict === "UNMET")) return "INELIGIBLE";
  if (conditions.some((c) => c.verdict === "UNKNOWN")) return "CHECK_NEEDED";
  return "ELIGIBLE";
}

/** 원리금균등상환 월 납입액. 금리 0이면 원금/개월. */
export function monthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number,
): number {
  const n = termYears * 12;
  if (n <= 0) return principal;
  if (annualRate <= 0) return principal / n;
  const r = annualRate / 12;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

/** 연간 상환 여력을 원금으로 환산(원리금균등상환의 역함수). */
export function principalFromAnnualCapacity(
  annualCapacity: number,
  annualRate: number,
  termYears: number,
): number {
  if (annualCapacity <= 0) return 0;
  const n = termYears * 12;
  const monthly = annualCapacity / 12;
  if (annualRate <= 0) return Math.floor(monthly * n);
  const r = annualRate / 12;
  const factor = Math.pow(1 + r, n);
  return Math.floor((monthly * (factor - 1)) / (r * factor));
}

/**
 * FR-008 · FR-016 — 상품별 자격 판정과 예상 한도.
 *
 * 예상 한도 = min(담보가치×LTV, DSR 잔여 상환여력의 원금 환산, 상품 최대 한도).
 * 부적격 상품의 한도는 0원이다. 확인 필요 상품은 한도를 계산하되 조합에서 구분한다.
 */
export function assessProducts(input: {
  readonly rules: readonly LoanProductRule[];
  readonly finance: FinanceInput;
  readonly household: HouseholdInput;
  readonly targetPrice: number;
}): readonly ProductAssessment[] {
  const { rules, finance, household, targetPrice } = input;
  return rules
    .map((rule): ProductAssessment => {
      const conditions = rule.conditions.map((c) =>
        evaluateCondition(c, { finance, household, targetPrice }),
      );
      const status = statusOf(conditions);
      const missingFields = Array.from(
        new Set(
          conditions
            .filter((c) => c.missingField)
            .map((c) => c.missingField as string),
        ),
      );

      const ltvCap = Math.floor(targetPrice * rule.ltv);
      // DSR: 허용 연간 상환액에서 기존 연간 원리금을 뺀 잔여만 신규 상환 여력이다(AC2).
      const allowedAnnual = finance.annualIncome * rule.dsr;
      const remainingAnnual = Math.max(
        allowedAnnual - finance.existingAnnualRepayment,
        0,
      );
      const dsrCap = principalFromAnnualCapacity(
        remainingAnnual,
        rule.annualRateMax,
        rule.termYears,
      );
      const productCap = rule.maxAmount;

      const estimatedAmount =
        status === "INELIGIBLE"
          ? 0
          : Math.max(Math.min(ltvCap, dsrCap, productCap), 0);
      const annualRepayment = Math.round(
        monthlyPayment(estimatedAmount, rule.annualRateMax, rule.termYears) *
          12,
      );

      return {
        productId: rule.productId,
        name: rule.name,
        kind: rule.kind,
        status,
        conditions,
        missingFields,
        estimatedAmount,
        ltvCap,
        dsrCap,
        productCap,
        annualRateMin: rule.annualRateMin,
        annualRateMax: rule.annualRateMax,
        termYears: rule.termYears,
        exclusiveGroup: rule.exclusiveGroup,
        preparations: rule.preparations,
        officialSource: rule.officialSource,
        effectiveFrom: rule.effectiveFrom,
        effectiveTo: rule.effectiveTo,
        annualRepayment,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/** 규칙 유효기간 필터(FR-016 Edge). 종료된 규칙은 매칭 대상에서 제외한다. */
export function activeRules(
  rules: readonly LoanProductRule[],
  at: string,
): readonly LoanProductRule[] {
  const now = new Date(`${at}T00:00:00Z`).getTime();
  return rules.filter((r) => {
    if (new Date(`${r.effectiveFrom}T00:00:00Z`).getTime() > now) return false;
    if (r.effectiveTo && new Date(`${r.effectiveTo}T00:00:00Z`).getTime() < now)
      return false;
    return true;
  });
}
