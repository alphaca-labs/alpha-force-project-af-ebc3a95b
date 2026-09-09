import type {
  CharacterState,
  DetourCard,
  FinanceInput,
  HouseholdInput,
  LoanProductRule,
  MarketPrice,
  ProductAssessment,
  SimulationResult,
  Timeline,
} from "./types";
import { activeRules, assessProducts } from "./eligibility";
import { isStale } from "./market-price";
import { formatKrwShort, formatMonths } from "./format";

/**
 * FR-008.AC3 — 총 예상 대출 한도.
 *
 * 상호 배타 그룹마다 가장 큰 한도 하나만 남기고, 서로 다른 그룹만 합산한다.
 * 부적격 상품은 assessProducts 단계에서 0원이라 자연히 빠진다.
 */
export function combineLoanCapacity(products: readonly ProductAssessment[]): {
  readonly total: number;
  readonly selectedProductIds: readonly string[];
} {
  const best = new Map<string, ProductAssessment>();
  for (const p of products) {
    if (p.status === "INELIGIBLE" || p.estimatedAmount <= 0) continue;
    const current = best.get(p.exclusiveGroup);
    if (
      !current ||
      p.estimatedAmount > current.estimatedAmount ||
      (p.estimatedAmount === current.estimatedAmount &&
        p.name.localeCompare(current.name, "ko") < 0)
    ) {
      best.set(p.exclusiveGroup, p);
    }
  }
  const picked = [...best.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "ko"),
  );
  return {
    total: picked.reduce((sum, p) => sum + p.estimatedAmount, 0),
    selectedProductIds: picked.map((p) => p.productId),
  };
}

/** FR-009 — 예상 기간. */
export function computeTimeline(
  shortfall: number,
  monthlySaving: number,
): Timeline {
  if (shortfall <= 0) return { status: "IMMEDIATE" };
  if (monthlySaving <= 0)
    return { status: "UNCOMPUTABLE", reason: "NO_MONTHLY_SAVING" };
  const months = Math.ceil(shortfall / monthlySaving);
  return {
    status: "MONTHS",
    months,
    years: Math.floor(months / 12),
    restMonths: months % 12,
    // 1,200개월 이상은 「100년 이상」으로 표시하되 원 계산값은 그대로 둔다.
    overCentury: months >= 1200,
  };
}

/** FR-010 — 캐릭터 상태. 경계값 12개월은 여유, 1,200개월은 이번 생 불가다. */
export function computeCharacter(timeline: Timeline): CharacterState {
  if (timeline.status === "IMMEDIATE") return "COMFORTABLE";
  if (timeline.status === "UNCOMPUTABLE") return "IMPOSSIBLE";
  if (timeline.months <= 12) return "COMFORTABLE";
  if (timeline.months >= 1200) return "IMPOSSIBLE";
  return "GRINDING";
}

export const CHARACTER_LABEL: Record<CharacterState, string> = {
  COMFORTABLE: "여유",
  GRINDING: "영끌 노력",
  IMPOSSIBLE: "이번 생 불가",
};

/** FR-011.AC2 — 절망 지수. */
export function computeDespairIndex(timeline: Timeline): number {
  if (timeline.status === "IMMEDIATE") return 0;
  if (timeline.status === "UNCOMPUTABLE") return 100;
  return Math.min(Math.ceil(timeline.months / 12), 100);
}

/**
 * FR-011.AC3 — 장착 장비와 레이드 메시지.
 * 상태별 사전 정의 집합에서 목표 매물명·평형·기간을 결합한다.
 * 같은 입력은 항상 같은 문구를 낸다(사전 정의 배열을 그대로 쓰고 난수를 쓰지 않는다).
 */
const EQUIPMENT: Record<CharacterState, readonly string[]> = {
  COMFORTABLE: ["여유의 선글라스", "현관 열쇠 꾸러미", "느긋한 산책화"],
  GRINDING: ["천장에 매단 굴비", "흰쌀밥 한 공기", "가계부 방패"],
  IMPOSSIBLE: ["텅 빈 지갑", "퀭한 눈", "식은 커피"],
};

export function buildEquipment(character: CharacterState): readonly string[] {
  return EQUIPMENT[character];
}

export function buildRaidMessage(input: {
  readonly character: CharacterState;
  readonly propertyName: string;
  readonly areaLabel: string;
  readonly timeline: Timeline;
}): string {
  const target = `${input.propertyName} ${input.areaLabel}`;
  const period = formatMonths(input.timeline);
  switch (input.character) {
    case "COMFORTABLE":
      return `[레이드] ${target} 공략까지 ${period}. 이미 입장 조건을 만족했다.`;
    case "GRINDING":
      return `[레이드] ${target} 공략까지 ${period}. 파티는 아직 살아 있다.`;
    case "IMPOSSIBLE":
      return `[레이드] ${target} 공략까지 ${period}. 다른 던전을 함께 보는 편이 낫다.`;
  }
}

/** FR-012 — 우회 카드 4종. 부족 자금 0원이어도 숨기지 않는다. */
export function buildDetours(
  shortfall: number,
  finance: FinanceInput,
): readonly DetourCard[] {
  const disclaimer =
    "풍자 목적의 계산이며 실제 수익·취업·당첨 가능성을 보장하지 않습니다.";
  if (shortfall <= 0) {
    const unnecessary = (id: DetourCard["id"], title: string): DetourCard => ({
      id,
      title,
      status: "UNNECESSARY",
      headline: "불필요",
      detail: "부족 자금이 0원이라 우회 경로가 필요하지 않습니다.",
      disclaimer,
    });
    return [
      unnecessary("LOTTERY", "로또"),
      unnecessary("COIN", "코인"),
      unnecessary("CORPORATE_SLAVE", "대기업 노예"),
      unnecessary("LIFE_RESET", "인생 리셋"),
    ];
  }

  const coin: DetourCard =
    finance.assets > 0
      ? {
          id: "COIN",
          title: "코인",
          status: "REQUIRED",
          headline: `${((finance.assets + shortfall) / finance.assets).toFixed(1)}배`,
          detail: `현재 보유 자산 ${formatKrwShort(finance.assets)}을 ${(
            (finance.assets + shortfall) /
            finance.assets
          ).toFixed(1)}배로 불려야 합니다. 필요 수익률 ${(
            ((finance.assets + shortfall) / finance.assets - 1) *
            100
          ).toFixed(1)}%.`,
          disclaimer,
        }
      : {
          id: "COIN",
          title: "코인",
          status: "UNCOMPUTABLE",
          headline: "계산 불가",
          detail: `보유 자산이 0원이라 수익 배수를 계산할 수 없습니다. 시작 원금이 필요하고, 메워야 할 금액은 ${formatKrwShort(shortfall)}입니다.`,
          disclaimer,
        };

  const extraAnnual = Math.max(
    Math.ceil(shortfall / 10) - finance.monthlySaving * 12,
    0,
  );

  return [
    {
      id: "LOTTERY",
      title: "로또",
      status: "REQUIRED",
      headline: formatKrwShort(shortfall),
      detail: `세금을 뗀 실수령 기준으로 ${formatKrwShort(shortfall)}을 한 번에 받아야 합니다.`,
      disclaimer,
    },
    coin,
    {
      id: "CORPORATE_SLAVE",
      title: "대기업 노예",
      status: "REQUIRED",
      headline:
        extraAnnual > 0
          ? `${formatKrwShort(extraAnnual)}/년`
          : "추가 저축 불필요",
      detail:
        extraAnnual > 0
          ? `10년 안에 메우려면 지금 저축 외에 연 ${formatKrwShort(extraAnnual)}을 더 모아야 합니다.`
          : "현재 저축 속도로 10년 안에 메울 수 있습니다.",
      disclaimer,
    },
    {
      id: "LIFE_RESET",
      title: "인생 리셋",
      status: "REQUIRED",
      headline: formatKrwShort(shortfall),
      detail: `다음 생을 ${formatKrwShort(shortfall)}의 초기 자산으로 시작해야 같은 목표에 도달합니다.`,
      disclaimer,
    },
  ];
}

export const BASE_DISCLAIMERS: readonly string[] = [
  "취득세·중개보수·이사비 등 부대비용은 계산에 포함되지 않았습니다.",
  "집값 상승·저축 이자·투자 수익은 기간 계산에 반영하지 않습니다.",
  "실거래가·규제·금리 변동으로 실제 매입가와 대출 한도는 달라질 수 있습니다.",
  "추정 결과이며 대출 승인·매입 가능을 보장하지 않습니다. 실제 실행에는 기관 심사가 필요합니다.",
];

/** FR-007~014 — 시뮬레이션 전체. 같은 입력·같은 규칙 버전은 항상 같은 결과를 낸다. */
export function simulate(input: {
  readonly marketPrice: Extract<MarketPrice, { status: "available" }>;
  readonly finance: FinanceInput;
  readonly household: HouseholdInput;
  readonly rules: readonly LoanProductRule[];
  readonly propertyName: string;
  readonly areaLabel: string;
  /** 판정 기준일(ISO date) */
  readonly at: string;
}): SimulationResult {
  const targetPrice = input.marketPrice.price;
  const rules = activeRules(input.rules, input.at);
  const products = assessProducts({
    rules,
    finance: input.finance,
    household: input.household,
    targetPrice,
  });
  const { total: loanCapacity, selectedProductIds } =
    combineLoanCapacity(products);

  const shortfall = Math.max(
    targetPrice - input.finance.assets - loanCapacity,
    0,
  );
  const achievementRate =
    Math.round(
      Math.min(
        ((input.finance.assets + loanCapacity) / targetPrice) * 100,
        100,
      ) * 10,
    ) / 10;
  const timeline = computeTimeline(shortfall, input.finance.monthlySaving);
  const character = computeCharacter(timeline);

  return {
    targetPrice,
    assets: input.finance.assets,
    loanCapacity,
    shortfall,
    achievementRate,
    timeline,
    character,
    characterLabel: CHARACTER_LABEL[character],
    despairIndex: computeDespairIndex(timeline),
    equipment: buildEquipment(character),
    raidMessage: buildRaidMessage({
      character,
      propertyName: input.propertyName,
      areaLabel: input.areaLabel,
      timeline,
    }),
    detours: buildDetours(shortfall, input.finance),
    products,
    selectedProductIds,
    disclaimers: BASE_DISCLAIMERS,
    staleData: isStale(input.marketPrice.baseDate, input.at),
    priceBaseDate: input.marketPrice.baseDate,
    priceSource: input.marketPrice.source,
    priceSourceLabel: input.marketPrice.sourceLabel,
  };
}
