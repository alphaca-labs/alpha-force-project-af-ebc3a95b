/**
 * 「뭐해야집사냐?」 도메인 타입 — PRD FR-001~024 계산 계약의 단일 출처.
 *
 * 금액 단위는 전부 **원(KRW) 단위 정수**다. 입력 상한은 999,999,999,999원(약 1조)으로
 * `Number.MAX_SAFE_INTEGER`(9,007,199,254,740,991) 안에 안전하게 들어오므로 도메인 계산은
 * `number` 를 쓴다. DB 는 `BigInt` 로 저장하므로 저장소 경계에서만 변환한다.
 */

/** 주택 유형. PRD 는 아파트·오피스텔만 다룬다. */
export type HousingType = "APARTMENT" | "OFFICETEL";

/** 대표 시세의 출처. 운영자 확정값이 자동 정규화값보다 우선한다(FR-006.AC3). */
export type PriceSource = "ADMIN_OVERRIDE" | "TRANSACTION_MEDIAN";

/** 대표 시세 산정 결과. `unavailable` 이면 시뮬레이션을 시작할 수 없다(FR-006 Edge). */
export type MarketPrice =
  | {
      readonly status: "available";
      readonly price: number;
      /** 기준일(ISO date). 30일 초과 시 화면 상단 경고(FR-014 Edge). */
      readonly baseDate: string;
      readonly source: PriceSource;
      /** 산정 대상 거래 기간(개월). override 는 null. */
      readonly windowMonths: 6 | 12 | null;
      /** 산정에 사용한 거래 건수. override 는 0. */
      readonly sampleCount: number;
      readonly sourceLabel: string;
    }
  | {
      readonly status: "unavailable";
      readonly reason: "NO_TRANSACTION_IN_12_MONTHS";
    };

/** 고객 재무 입력(FR-004). 전부 원 단위 정수. */
export type FinanceInput = {
  /** 동원 가능한 보유 자산 */
  readonly assets: number;
  /** 연 소득 */
  readonly annualIncome: number;
  /** 월 저축 가능 금액 */
  readonly monthlySaving: number;
  /** 기존 대출 잔액 */
  readonly existingLoanBalance: number;
  /** 기존 연간 원리금 상환액 */
  readonly existingAnnualRepayment: number;
};

/** 선택 가구 조건(FR-015). 미입력은 `null` 이며 임의로 적격 추정하지 않는다. */
export type HouseholdInput = {
  readonly noHome: boolean | null;
  readonly firstTime: boolean | null;
  readonly maritalStatus: "SINGLE" | "MARRIED" | null;
  /** 혼인 기간(개월). 미혼이면 계산에서 제거한다(FR-015 Edge). */
  readonly marriageMonths: number | null;
  readonly householdSize: number | null;
  readonly dependents: number | null;
  readonly age: number | null;
};

/** 대출 상품 규칙 버전(FR-028). 운영자가 관리하는 값이 그대로 들어온다. */
export type LoanProductRule = {
  readonly productId: string;
  readonly name: string;
  readonly kind: "GENERAL" | "GOVERNMENT";
  /** LTV 비율 0~1 */
  readonly ltv: number;
  /** DSR 허용 비율 0~1 */
  readonly dsr: number;
  readonly annualRateMin: number;
  readonly annualRateMax: number;
  /** 상환 기간(년) */
  readonly termYears: number;
  /** 상품 최대 한도(원) */
  readonly maxAmount: number;
  /**
   * 병행 그룹 키. 같은 키를 가진 상품은 상호 배타이며 한 조합에 하나만 들어간다.
   * 서로 다른 키끼리는 병행 가능하다(FR-008.AC3 · FR-017 규칙).
   */
  readonly exclusiveGroup: string;
  /** 자격 조건. 하나라도 위반이면 부적격, 판정 불가면 확인 필요(FR-016). */
  readonly conditions: readonly EligibilityCondition[];
  /** 준비 항목(FR-016.AC3) */
  readonly preparations: readonly string[];
  /** 공식 확인 출처 */
  readonly officialSource: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly version: number;
};

/** 상품 자격 조건 하나. 값이 없으면 «확인 필요» 로 떨어진다. */
export type EligibilityCondition =
  | { readonly kind: "NO_HOME"; readonly label: string }
  | { readonly kind: "FIRST_TIME"; readonly label: string }
  | {
      readonly kind: "MAX_ANNUAL_INCOME";
      readonly label: string;
      readonly value: number;
    }
  | {
      readonly kind: "MAX_PRICE";
      readonly label: string;
      readonly value: number;
    }
  | { readonly kind: "MAX_AGE"; readonly label: string; readonly value: number }
  | { readonly kind: "MIN_AGE"; readonly label: string; readonly value: number }
  | {
      readonly kind: "NEWLYWED_MONTHS";
      readonly label: string;
      readonly value: number;
    }
  | {
      readonly kind: "MIN_HOUSEHOLD_SIZE";
      readonly label: string;
      readonly value: number;
    };

export type ConditionVerdict = "MET" | "UNMET" | "UNKNOWN";

export type ConditionEvaluation = {
  readonly label: string;
  readonly verdict: ConditionVerdict;
  /** UNKNOWN 인 경우 사용자가 채워야 하는 항목 이름 */
  readonly missingField: string | null;
};

export type EligibilityStatus = "ELIGIBLE" | "INELIGIBLE" | "CHECK_NEEDED";

/** 상품별 자격 판정 + 예상 한도(FR-008 · FR-016). */
export type ProductAssessment = {
  readonly productId: string;
  readonly name: string;
  readonly kind: LoanProductRule["kind"];
  readonly status: EligibilityStatus;
  readonly conditions: readonly ConditionEvaluation[];
  readonly missingFields: readonly string[];
  /** 예상 한도. min(LTV 한도, DSR 환산 한도, 상품 최대 한도) */
  readonly estimatedAmount: number;
  readonly ltvCap: number;
  readonly dsrCap: number;
  readonly productCap: number;
  readonly annualRateMin: number;
  readonly annualRateMax: number;
  readonly termYears: number;
  readonly exclusiveGroup: string;
  readonly preparations: readonly string[];
  readonly officialSource: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  /** 이 상품을 실행할 때의 연간 원리금 부담(원) */
  readonly annualRepayment: number;
};

/** 캐릭터 상태(FR-010). */
export type CharacterState = "COMFORTABLE" | "GRINDING" | "IMPOSSIBLE";

/** 예상 기간(FR-009). */
export type Timeline =
  | { readonly status: "IMMEDIATE" }
  | {
      readonly status: "MONTHS";
      readonly months: number;
      readonly years: number;
      readonly restMonths: number;
      readonly overCentury: boolean;
    }
  | { readonly status: "UNCOMPUTABLE"; readonly reason: "NO_MONTHLY_SAVING" };

/** 우회 카드(FR-012). */
export type DetourCard = {
  readonly id: "LOTTERY" | "COIN" | "CORPORATE_SLAVE" | "LIFE_RESET";
  readonly title: string;
  readonly status: "REQUIRED" | "UNNECESSARY" | "UNCOMPUTABLE";
  readonly headline: string;
  readonly detail: string;
  readonly disclaimer: string;
};

/** 시뮬레이션 결과(FR-007~014). */
export type SimulationResult = {
  readonly targetPrice: number;
  readonly assets: number;
  readonly loanCapacity: number;
  readonly shortfall: number;
  /** 달성률 0~100, 소수점 첫째 자리 */
  readonly achievementRate: number;
  readonly timeline: Timeline;
  readonly character: CharacterState;
  readonly characterLabel: string;
  /** 절망 지수 0~100 */
  readonly despairIndex: number;
  readonly equipment: readonly string[];
  readonly raidMessage: string;
  readonly detours: readonly DetourCard[];
  readonly products: readonly ProductAssessment[];
  readonly selectedProductIds: readonly string[];
  readonly disclaimers: readonly string[];
  readonly staleData: boolean;
  readonly priceBaseDate: string;
  readonly priceSource: PriceSource;
  readonly priceSourceLabel: string;
};

/** 조달 시나리오(FR-017). */
export type FundingScenario = {
  readonly id: string;
  readonly productIds: readonly string[];
  readonly productNames: readonly string[];
  readonly loanTotal: number;
  readonly remainingShortfall: number;
  readonly annualRepayment: number;
  readonly averageRate: number;
  readonly timeline: Timeline;
  readonly recommended: boolean;
  readonly includesCheckNeeded: boolean;
};

/** 로드맵 미션(FR-018 · FR-019). `id` 는 로드맵이 바뀌어도 안정적이다. */
export type RoadmapMission = {
  readonly id: string;
  readonly stage: RoadmapStageId;
  readonly cadence: "WEEKLY" | "MONTHLY" | "ONCE";
  readonly title: string;
  readonly doneCriteria: string;
  readonly scenarioId: string | null;
};

export type RoadmapStageId =
  | "CURRENT"
  | "ACCUMULATE"
  | "VERIFY_ELIGIBILITY"
  | "PREPARE_LOAN"
  | "PREPARE_PURCHASE";

export type RoadmapStage = {
  readonly id: RoadmapStageId;
  readonly title: string;
  readonly summary: string;
  readonly missions: readonly RoadmapMission[];
};

export type Roadmap = {
  readonly stages: readonly RoadmapStage[];
  readonly missions: readonly RoadmapMission[];
  readonly monthlyTarget: number;
  readonly weeklyTarget: number;
  readonly scenarios: readonly FundingScenario[];
  readonly recommendedScenarioId: string | null;
};
