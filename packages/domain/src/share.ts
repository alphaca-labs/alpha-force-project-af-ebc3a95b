import type { FinanceInput, HouseholdInput } from "./types";

/**
 * FR-022.AC3 — 결과 해시.
 *
 * 입력·매물/평형·적용 시세 버전·적용 규칙 버전이 모두 같으면 같은 해시가 나온다.
 * 같은 해시면 기존 공유 URL 을 재사용하고, 하나라도 바뀌면 새 URL 을 만든다.
 * 해시 자체는 비밀이 아니다(토큰이 접근 통제를 맡는다). 결정적 문자열만 만든다.
 */
export function buildResultFingerprint(input: {
  readonly propertyId: string;
  readonly areaId: string;
  readonly priceVersion: string;
  readonly ruleVersions: readonly string[];
  readonly finance: FinanceInput;
  readonly household: HouseholdInput;
}): string {
  const parts = [
    input.propertyId,
    input.areaId,
    input.priceVersion,
    [...input.ruleVersions].sort().join(","),
    input.finance.assets,
    input.finance.annualIncome,
    input.finance.monthlySaving,
    input.finance.existingLoanBalance,
    input.finance.existingAnnualRepayment,
    input.household.noHome,
    input.household.firstTime,
    input.household.maritalStatus,
    // 미혼이면 혼인 기간은 계산에서 제거되므로 지문에도 넣지 않는다.
    input.household.maritalStatus === "SINGLE"
      ? null
      : input.household.marriageMonths,
    input.household.householdSize,
    input.household.dependents,
    input.household.age,
  ];
  return parts
    .map((p) => (p === null || p === undefined ? "-" : String(p)))
    .join("|");
}

/** 공유 화면에 링크 보유자에게 공개되는 항목(FR-022.AC2). 확인 화면이 이 목록을 그대로 보여 준다. */
export const SHARE_PUBLIC_FIELDS: readonly string[] = [
  "목표 매물명과 평형",
  "목표 시세와 기준일",
  "보유 자산·연 소득·월 저축 가능 금액",
  "예상 대출 한도와 부족 자금",
  "목표 달성률과 예상 기간",
  "캐릭터 상태·절망 지수·장착 장비",
  "추천 조달 조합과 로드맵 요약",
];

/** 공유·이미지에 절대 싣지 않는 항목(FR-021 · FR-022 규칙). */
export const SHARE_EXCLUDED_FIELDS: readonly string[] = [
  "성명·주민등록번호 등 식별 정보",
  "금융기관 식별값과 인증 정보",
  "기존 대출의 기관·계좌 정보",
];
