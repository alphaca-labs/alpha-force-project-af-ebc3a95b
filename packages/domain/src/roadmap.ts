import type {
  FundingScenario,
  ProductAssessment,
  Roadmap,
  RoadmapMission,
  RoadmapStage,
  SimulationResult,
} from "./types";
import { computeTimeline } from "./simulate";
import { formatKrwShort, formatMonths } from "./format";

/**
 * 상호 배타 그룹을 지키면서 만들 수 있는 조합을 전부 만든다.
 *
 * 상한 근거: 조합 수는 그룹별 (선택 안 함 + 그룹 내 상품 수)의 곱이다. 운영 규칙 원장은
 * 그룹 4개(GENERAL/DIDIMDOL/BOGEUMJARI/JEONSE)이고 그룹당 상품은 최대 3개이므로
 * 최악 조합 수는 4^4 = 256이다. 화면·저장에는 상위 8개만 남긴다.
 */
function buildCombinations(
  products: readonly ProductAssessment[],
): readonly (readonly ProductAssessment[])[] {
  const groups = new Map<string, ProductAssessment[]>();
  for (const p of products) {
    if (p.status === "INELIGIBLE" || p.estimatedAmount <= 0) continue;
    const list = groups.get(p.exclusiveGroup) ?? [];
    list.push(p);
    groups.set(p.exclusiveGroup, list);
  }
  let combos: ProductAssessment[][] = [[]];
  for (const list of groups.values()) {
    const next: ProductAssessment[][] = [];
    for (const combo of combos) {
      next.push(combo);
      for (const product of list) next.push([...combo, product]);
    }
    combos = next;
  }
  return combos;
}

/**
 * FR-017 — 조달 시나리오 생성과 추천.
 *
 * 정렬 순서: 예상 달성 기간 짧은 순 → 연간 원리금 부담 낮은 순 → 적용 금리 낮은 순 →
 * 상품명 오름차순(Edge: 모든 기준이 같을 때의 결정적 순서).
 */
export function buildScenarios(input: {
  readonly result: SimulationResult;
  readonly monthlySaving: number;
}): readonly FundingScenario[] {
  const { result } = input;
  const combos = buildCombinations(result.products);

  const scenarios = combos.map((combo): FundingScenario => {
    const loanTotal = combo.reduce((s, p) => s + p.estimatedAmount, 0);
    const remaining = Math.max(
      result.targetPrice - result.assets - loanTotal,
      0,
    );
    const names = combo.map((p) => p.name);
    return {
      id:
        combo.length === 0
          ? "savings-only"
          : combo
              .map((p) => p.productId)
              .sort()
              .join("+"),
      productIds: combo.map((p) => p.productId),
      productNames: names,
      loanTotal,
      remainingShortfall: remaining,
      annualRepayment: combo.reduce((s, p) => s + p.annualRepayment, 0),
      averageRate:
        combo.length === 0
          ? 0
          : combo.reduce((s, p) => s + p.annualRateMax, 0) / combo.length,
      timeline: computeTimeline(remaining, input.monthlySaving),
      recommended: false,
      includesCheckNeeded: combo.some((p) => p.status === "CHECK_NEEDED"),
    };
  });

  const rank = (s: FundingScenario): number => {
    if (s.timeline.status === "IMMEDIATE") return 0;
    if (s.timeline.status === "UNCOMPUTABLE") return Number.MAX_SAFE_INTEGER;
    return s.timeline.months;
  };

  const sorted = [...scenarios].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.annualRepayment !== b.annualRepayment)
      return a.annualRepayment - b.annualRepayment;
    if (a.averageRate !== b.averageRate) return a.averageRate - b.averageRate;
    return a.productNames
      .join(",")
      .localeCompare(b.productNames.join(","), "ko");
  });

  const top = sorted.slice(0, 8);
  return top.map((s, index) => ({ ...s, recommended: index === 0 }));
}

const STAGE_TITLE: Record<
  RoadmapStage["id"],
  { title: string; summary: string }
> = {
  CURRENT: {
    title: "현재 상태",
    summary: "지금 조건에서의 격차와 기준을 확인한다.",
  },
  ACCUMULATE: {
    title: "자산 축적",
    summary: "월·주 단위 저축 목표를 실제 행동으로 바꾼다.",
  },
  VERIFY_ELIGIBILITY: {
    title: "자격 확인",
    summary: "우대 조건을 공식 창구에서 확정한다.",
  },
  PREPARE_LOAN: {
    title: "대출 준비",
    summary: "추천 조합의 서류와 사전 상담을 준비한다.",
  },
  PREPARE_PURCHASE: {
    title: "매입 준비",
    summary: "계약 전 실사와 부대비용을 점검한다.",
  },
};

/**
 * FR-018 — 로드맵과 미션.
 *
 * 미션 ID 는 로드맵이 다시 계산돼도 안정적이어야 한다(FR-019 Edge). 그래서 순번이 아니라
 * `stage:종류:식별자` 형태의 의미 기반 키를 쓴다.
 */
export function buildRoadmap(input: {
  readonly result: SimulationResult;
  readonly monthlySaving: number;
}): Roadmap {
  const scenarios = buildScenarios(input);
  const recommended = scenarios.find((s) => s.recommended) ?? null;
  const monthlyTarget = input.monthlySaving;
  const weeklyTarget = Math.floor((input.monthlySaving * 12) / 52);
  const missions: RoadmapMission[] = [];

  const uncomputable = input.result.timeline.status === "UNCOMPUTABLE";

  missions.push({
    id: "CURRENT:review:gap",
    stage: "CURRENT",
    cadence: "ONCE",
    title: uncomputable
      ? "월 저축 가능 금액을 0원보다 크게 조정한다"
      : `현재 격차 ${formatKrwShort(input.result.shortfall)}과 기준일을 확인한다`,
    doneCriteria: uncomputable
      ? "결과 화면의 조정 패널에서 월 저축액을 다시 입력했다"
      : "부족 자금·달성률·기준일을 모두 읽었다",
    scenarioId: null,
  });

  if (!uncomputable && monthlyTarget > 0) {
    missions.push({
      id: "ACCUMULATE:save:monthly",
      stage: "ACCUMULATE",
      cadence: "MONTHLY",
      title: `이번 달 ${formatKrwShort(monthlyTarget)} 저축`,
      doneCriteria: "저축 계좌 이체가 끝났다",
      scenarioId: recommended?.id ?? null,
    });
    missions.push({
      id: "ACCUMULATE:save:weekly",
      stage: "ACCUMULATE",
      cadence: "WEEKLY",
      title: `이번 주 ${formatKrwShort(weeklyTarget)} 저축`,
      doneCriteria: "주간 목표만큼 남겼다",
      scenarioId: recommended?.id ?? null,
    });
    missions.push({
      id: "ACCUMULATE:review:spending",
      stage: "ACCUMULATE",
      cadence: "WEEKLY",
      title: "주간 지출을 한 번 점검한다",
      doneCriteria: "고정비 항목을 확인했다",
      scenarioId: null,
    });
  }

  for (const product of input.result.products) {
    if (product.status === "CHECK_NEEDED") {
      missions.push({
        id: `VERIFY_ELIGIBILITY:confirm:${product.productId}`,
        stage: "VERIFY_ELIGIBILITY",
        cadence: "ONCE",
        title: `${product.name} 자격 확인 (${product.missingFields.join(", ") || "조건 재확인"})`,
        doneCriteria: `${product.officialSource} 에서 조건을 확인했다`,
        scenarioId: null,
      });
    }
  }

  if (recommended && recommended.productIds.length > 0) {
    for (const productId of recommended.productIds) {
      const product = input.result.products.find(
        (p) => p.productId === productId,
      );
      if (!product) continue;
      for (const prep of product.preparations) {
        missions.push({
          id: `PREPARE_LOAN:prep:${product.productId}:${prep}`,
          stage: "PREPARE_LOAN",
          cadence: "ONCE",
          title: `${product.name} — ${prep}`,
          doneCriteria: "서류를 준비했거나 창구에서 확인했다",
          scenarioId: recommended.id,
        });
      }
      missions.push({
        id: `PREPARE_LOAN:official:${product.productId}`,
        stage: "PREPARE_LOAN",
        cadence: "MONTHLY",
        title: `${product.name} 조건을 공식 기관에서 재확인한다`,
        doneCriteria: `${product.officialSource} 의 최신 고시를 확인했다`,
        scenarioId: recommended.id,
      });
    }
  }

  missions.push({
    id: "PREPARE_PURCHASE:cost:extra",
    stage: "PREPARE_PURCHASE",
    cadence: "ONCE",
    title: "취득세·중개보수·이사비를 별도로 추산한다",
    doneCriteria: "부대비용 예산을 따로 적어 두었다",
    scenarioId: null,
  });
  missions.push({
    id: "PREPARE_PURCHASE:visit:site",
    stage: "PREPARE_PURCHASE",
    cadence: "ONCE",
    title: "목표 단지를 현장에서 한 번 확인한다",
    doneCriteria: "방문 또는 상담 기록을 남겼다",
    scenarioId: null,
  });

  const stageIds: RoadmapStage["id"][] = [
    "CURRENT",
    "ACCUMULATE",
    "VERIFY_ELIGIBILITY",
    "PREPARE_LOAN",
    "PREPARE_PURCHASE",
  ];

  const stages: RoadmapStage[] = stageIds.map((id) => ({
    id,
    title: STAGE_TITLE[id].title,
    summary: STAGE_TITLE[id].summary,
    missions: missions.filter((m) => m.stage === id),
  }));

  return {
    stages,
    missions,
    monthlyTarget,
    weeklyTarget,
    scenarios,
    recommendedScenarioId: recommended?.id ?? null,
  };
}

export function scenarioSummary(scenario: FundingScenario): string {
  const names =
    scenario.productNames.length > 0
      ? scenario.productNames.join(" + ")
      : "저축만";
  return `${names} · 대출 ${formatKrwShort(scenario.loanTotal)} · ${formatMonths(scenario.timeline)}`;
}
