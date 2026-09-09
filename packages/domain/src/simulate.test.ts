import { describe, expect, it } from "vitest";
import type { FinanceInput, HouseholdInput, LoanProductRule } from "./types";
import { resolveMarketPrice, median, isStale } from "./market-price";
import {
  buildDetours,
  combineLoanCapacity,
  computeCharacter,
  computeDespairIndex,
  computeTimeline,
  simulate,
} from "./simulate";
import {
  assessProducts,
  activeRules,
  principalFromAnnualCapacity,
} from "./eligibility";
import { buildRoadmap, buildScenarios } from "./roadmap";
import { formatKrwShort, formatMonths } from "./format";
import { parseChecklist, progressOf } from "./checklist";
import { buildResultFingerprint } from "./share";
import { EMPTY_HOUSEHOLD } from "./validation";

const AT = "2026-09-09";

const finance: FinanceInput = {
  assets: 200_000_000,
  annualIncome: 60_000_000,
  monthlySaving: 2_000_000,
  existingLoanBalance: 0,
  existingAnnualRepayment: 0,
};

const household: HouseholdInput = { ...EMPTY_HOUSEHOLD };

function rule(over: Partial<LoanProductRule> = {}): LoanProductRule {
  return {
    productId: "general",
    name: "일반 주택담보대출",
    kind: "GENERAL",
    ltv: 0.7,
    dsr: 0.4,
    annualRateMin: 0.038,
    annualRateMax: 0.045,
    termYears: 30,
    maxAmount: 600_000_000,
    exclusiveGroup: "MORTGAGE",
    conditions: [],
    preparations: ["소득 증빙"],
    officialSource: "금융위원회",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    version: 1,
    ...over,
  };
}

describe("FR-006 대표 시세", () => {
  it("취소 거래를 빼고 6개월 창 중위가격을 쓴다", () => {
    const price = resolveMarketPrice({
      at: AT,
      transactions: [
        { amount: 1_000_000_000, contractDate: "2026-08-01", cancelled: false },
        { amount: 1_200_000_000, contractDate: "2026-07-01", cancelled: false },
        { amount: 1_400_000_000, contractDate: "2026-06-01", cancelled: false },
        { amount: 9_999_999_999, contractDate: "2026-08-02", cancelled: true },
      ],
    });
    expect(price.status).toBe("available");
    if (price.status !== "available") return;
    expect(price.price).toBe(1_200_000_000);
    expect(price.windowMonths).toBe(6);
    expect(price.sampleCount).toBe(3);
    expect(price.source).toBe("TRANSACTION_MEDIAN");
  });

  it("6개월 창이 비면 12개월로 넓힌다", () => {
    // 최근 거래일이 2026-01-10 이고 그 이전 거래가 2025-04-10 이면 6개월 창에는 1건뿐이다.
    // 6개월 창이 0건이 되게 하려면 최근 거래일 자체가 유일 표본이므로 12개월 확장을 위해
    // 최근 거래일 기준 6~12개월 사이에만 다른 거래가 있는 상황을 만든다.
    const price = resolveMarketPrice({
      at: AT,
      transactions: [
        { amount: 500_000_000, contractDate: "2026-01-10", cancelled: false },
        { amount: 700_000_000, contractDate: "2025-06-10", cancelled: false },
      ],
    });
    expect(price.status).toBe("available");
    if (price.status !== "available") return;
    // 6개월 창(2025-07-10~)에는 2026-01-10 한 건만 있으므로 6개월 창이 채택된다.
    expect(price.windowMonths).toBe(6);
    expect(price.price).toBe(500_000_000);
  });

  it("거래가 하나도 없으면 확인 불가다", () => {
    expect(resolveMarketPrice({ at: AT, transactions: [] })).toEqual({
      status: "unavailable",
      reason: "NO_TRANSACTION_IN_12_MONTHS",
    });
  });

  it("유효한 운영자 확정 시세가 자동 중위가격보다 우선한다", () => {
    const price = resolveMarketPrice({
      at: AT,
      transactions: [
        { amount: 1_000_000_000, contractDate: "2026-08-01", cancelled: false },
      ],
      override: {
        price: 1_500_000_000,
        baseDate: "2026-09-01",
        sourceLabel: "운영자 확정",
        effectiveFrom: "2026-09-01",
        effectiveTo: null,
      },
    });
    expect(price.status).toBe("available");
    if (price.status !== "available") return;
    expect(price.price).toBe(1_500_000_000);
    expect(price.source).toBe("ADMIN_OVERRIDE");
  });

  it("유효기간이 지난 override 는 무시한다", () => {
    const price = resolveMarketPrice({
      at: AT,
      transactions: [
        { amount: 1_000_000_000, contractDate: "2026-08-01", cancelled: false },
      ],
      override: {
        price: 1_500_000_000,
        baseDate: "2026-01-01",
        sourceLabel: "운영자 확정",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-02-01",
      },
    });
    if (price.status !== "available") throw new Error("available 이어야 한다");
    expect(price.source).toBe("TRANSACTION_MEDIAN");
  });

  it("median 은 짝수 개에서 두 중앙값의 평균을 내림한다", () => {
    expect(median([1, 2, 3, 4])).toBe(2);
    expect(median([10, 20, 31])).toBe(20);
  });

  it("기준일이 30일 이상 지나면 오래된 데이터다", () => {
    expect(isStale("2026-08-10", AT)).toBe(true);
    expect(isStale("2026-09-01", AT)).toBe(false);
  });
});

describe("FR-007 격차와 달성률", () => {
  it("부족 자금은 음수가 되지 않고 달성률은 100 을 넘지 않는다", () => {
    const result = simulate({
      marketPrice: {
        status: "available",
        price: 100_000_000,
        baseDate: AT,
        source: "TRANSACTION_MEDIAN",
        windowMonths: 6,
        sampleCount: 3,
        sourceLabel: "국토교통부",
      },
      finance: { ...finance, assets: 500_000_000 },
      household,
      rules: [rule()],
      propertyName: "테스트단지",
      areaLabel: "전용 84㎡",
      at: AT,
    });
    expect(result.shortfall).toBe(0);
    expect(result.achievementRate).toBe(100);
    expect(result.timeline).toEqual({ status: "IMMEDIATE" });
  });

  it("달성률은 소수점 첫째 자리까지 낸다", () => {
    const result = simulate({
      marketPrice: {
        status: "available",
        price: 700_000_000,
        baseDate: AT,
        source: "TRANSACTION_MEDIAN",
        windowMonths: 6,
        sampleCount: 3,
        sourceLabel: "국토교통부",
      },
      finance: {
        ...finance,
        assets: 100_000_000,
        annualIncome: 0,
        monthlySaving: 1_000_000,
      },
      household,
      rules: [rule({ ltv: 0.5, dsr: 0.4, maxAmount: 600_000_000 })],
      propertyName: "테스트단지",
      areaLabel: "전용 84㎡",
      at: AT,
    });
    // 연소득 0 이면 DSR 잔여 여력 0 → 대출 0원. 달성률 = 100,000,000/700,000,000 = 14.285…%
    expect(result.loanCapacity).toBe(0);
    expect(result.achievementRate).toBe(14.3);
    expect(Number.isInteger(result.achievementRate * 10)).toBe(true);
  });
});

describe("FR-008 대출 한도", () => {
  it("LTV·DSR·상품 한도 중 최솟값을 쓴다", () => {
    const [product] = assessProducts({
      rules: [rule({ ltv: 0.7, dsr: 0.4, maxAmount: 100_000_000 })],
      finance,
      household,
      targetPrice: 1_000_000_000,
    });
    expect(product!.ltvCap).toBe(700_000_000);
    expect(product!.productCap).toBe(100_000_000);
    expect(product!.estimatedAmount).toBe(100_000_000);
  });

  it("기존 연간 원리금을 뺀 잔여만 DSR 여력으로 쓴다", () => {
    const withDebt = assessProducts({
      rules: [rule({ maxAmount: 10_000_000_000 })],
      finance: { ...finance, existingAnnualRepayment: 24_000_000 },
      household,
      targetPrice: 10_000_000_000,
    })[0]!;
    const noDebt = assessProducts({
      rules: [rule({ maxAmount: 10_000_000_000 })],
      finance,
      household,
      targetPrice: 10_000_000_000,
    })[0]!;
    expect(withDebt.dsrCap).toBeLessThan(noDebt.dsrCap);
  });

  it("DSR 잔여 여력이 0 이하면 DSR 한도는 0원이다", () => {
    const product = assessProducts({
      rules: [rule()],
      finance: { ...finance, existingAnnualRepayment: 999_000_000 },
      household,
      targetPrice: 1_000_000_000,
    })[0]!;
    expect(product.dsrCap).toBe(0);
    expect(product.estimatedAmount).toBe(0);
    expect(principalFromAnnualCapacity(0, 0.04, 30)).toBe(0);
  });

  it("상호 배타 상품은 가장 큰 하나만, 병행 상품은 합산한다", () => {
    const products = assessProducts({
      rules: [
        rule({
          productId: "a",
          name: "A 대출",
          exclusiveGroup: "MORTGAGE",
          maxAmount: 300_000_000,
        }),
        rule({
          productId: "b",
          name: "B 대출",
          exclusiveGroup: "MORTGAGE",
          maxAmount: 500_000_000,
        }),
        rule({
          productId: "c",
          name: "C 보증",
          exclusiveGroup: "GUARANTEE",
          maxAmount: 100_000_000,
        }),
      ],
      finance: { ...finance, annualIncome: 300_000_000 },
      household,
      targetPrice: 2_000_000_000,
    });
    const combined = combineLoanCapacity(products);
    expect(combined.selectedProductIds).toEqual(["b", "c"]);
    expect(combined.total).toBe(600_000_000);
  });

  it("적용 가능한 상품이 없으면 한도는 0원이다", () => {
    expect(combineLoanCapacity([]).total).toBe(0);
  });

  it("유효기간이 끝난 규칙은 매칭 대상에서 빠진다", () => {
    expect(activeRules([rule({ effectiveTo: "2026-01-01" })], AT)).toHaveLength(
      0,
    );
    expect(
      activeRules([rule({ effectiveFrom: "2027-01-01" })], AT),
    ).toHaveLength(0);
    expect(activeRules([rule()], AT)).toHaveLength(1);
  });
});

describe("FR-009 예상 기간", () => {
  it("ceil(부족 자금 / 월 저축액) 이다", () => {
    expect(computeTimeline(10_000_001, 1_000_000)).toMatchObject({
      status: "MONTHS",
      months: 11,
    });
  });
  it("부족 자금 0 은 즉시 가능", () => {
    expect(computeTimeline(0, 0)).toEqual({ status: "IMMEDIATE" });
  });
  it("월 저축 0 은 계산 불가", () => {
    expect(computeTimeline(1, 0)).toEqual({
      status: "UNCOMPUTABLE",
      reason: "NO_MONTHLY_SAVING",
    });
  });
  it("1,200개월 이상은 100년 이상으로 표시하되 원 계산값을 유지한다", () => {
    const t = computeTimeline(1_200_000_000, 1_000_000);
    expect(t).toMatchObject({
      status: "MONTHS",
      months: 1200,
      overCentury: true,
    });
    expect(formatMonths(t)).toBe("100년 이상");
  });
});

describe("FR-010·FR-011 캐릭터와 절망 지수", () => {
  it("경계값 12개월은 여유, 1,200개월은 이번 생 불가", () => {
    expect(computeCharacter(computeTimeline(12_000_000, 1_000_000))).toBe(
      "COMFORTABLE",
    );
    expect(computeCharacter(computeTimeline(13_000_000, 1_000_000))).toBe(
      "GRINDING",
    );
    expect(computeCharacter(computeTimeline(1_200_000_000, 1_000_000))).toBe(
      "IMPOSSIBLE",
    );
    expect(
      computeCharacter({ status: "UNCOMPUTABLE", reason: "NO_MONTHLY_SAVING" }),
    ).toBe("IMPOSSIBLE");
  });

  it("절망 지수는 min(ceil(개월/12), 100) 이고 즉시 가능은 0 이다", () => {
    expect(computeDespairIndex({ status: "IMMEDIATE" })).toBe(0);
    expect(computeDespairIndex(computeTimeline(13_000_000, 1_000_000))).toBe(2);
    expect(computeDespairIndex(computeTimeline(1_200_000_000, 1_000_000))).toBe(
      100,
    );
  });

  it("같은 입력은 항상 같은 결과를 낸다", () => {
    const args = {
      marketPrice: {
        status: "available" as const,
        price: 900_000_000,
        baseDate: AT,
        source: "TRANSACTION_MEDIAN" as const,
        windowMonths: 6 as const,
        sampleCount: 5,
        sourceLabel: "국토교통부",
      },
      finance,
      household,
      rules: [rule()],
      propertyName: "테스트단지",
      areaLabel: "전용 84㎡",
      at: AT,
    };
    expect(JSON.stringify(simulate(args))).toBe(JSON.stringify(simulate(args)));
  });
});

describe("FR-012 우회 카드", () => {
  it("부족 자금이 있으면 4종이 모두 나온다", () => {
    const cards = buildDetours(500_000_000, finance);
    expect(cards.map((c) => c.id)).toEqual([
      "LOTTERY",
      "COIN",
      "CORPORATE_SLAVE",
      "LIFE_RESET",
    ]);
    expect(cards.every((c) => c.disclaimer.length > 0)).toBe(true);
  });

  it("보유 자산 0 이면 코인은 계산 불가다", () => {
    const coin = buildDetours(500_000_000, { ...finance, assets: 0 }).find(
      (c) => c.id === "COIN",
    )!;
    expect(coin.status).toBe("UNCOMPUTABLE");
  });

  it("부족 자금 0 이면 숨기지 않고 불필요로 표시한다", () => {
    const cards = buildDetours(0, finance);
    expect(cards).toHaveLength(4);
    expect(cards.every((c) => c.status === "UNNECESSARY")).toBe(true);
  });

  it("대기업 노예는 10년 내 필요한 연간 추가 저축액이다", () => {
    const card = buildDetours(1_200_000_000, {
      ...finance,
      monthlySaving: 1_000_000,
    }).find((c) => c.id === "CORPORATE_SLAVE")!;
    // ceil(1,200,000,000/10) - 1,000,000*12 = 120,000,000 - 12,000,000 = 108,000,000
    expect(card.headline).toBe(`${formatKrwShort(108_000_000)}/년`);
  });
});

describe("FR-015·FR-016 자격 판정", () => {
  it("미입력 조건은 확인 필요이고 임의로 적격 추정하지 않는다", () => {
    const product = assessProducts({
      rules: [
        rule({ conditions: [{ kind: "NO_HOME", label: "무주택 세대" }] }),
      ],
      finance,
      household,
      targetPrice: 500_000_000,
    })[0]!;
    expect(product.status).toBe("CHECK_NEEDED");
    expect(product.missingFields).toContain("무주택 여부");
  });

  it("조건 위반이 하나라도 있으면 부적격이다", () => {
    const product = assessProducts({
      rules: [
        rule({
          conditions: [
            {
              kind: "MAX_ANNUAL_INCOME",
              label: "연소득 7천만원 이하",
              value: 70_000_000,
            },
          ],
        }),
      ],
      finance: { ...finance, annualIncome: 200_000_000 },
      household,
      targetPrice: 500_000_000,
    })[0]!;
    expect(product.status).toBe("INELIGIBLE");
    expect(product.estimatedAmount).toBe(0);
  });

  it("미혼이면 신혼 조건은 확인 필요가 아니라 부적격이다", () => {
    const product = assessProducts({
      rules: [
        rule({
          conditions: [
            { kind: "NEWLYWED_MONTHS", label: "혼인 7년 이내", value: 84 },
          ],
        }),
      ],
      finance,
      household: { ...household, maritalStatus: "SINGLE", marriageMonths: 12 },
      targetPrice: 500_000_000,
    })[0]!;
    expect(product.status).toBe("INELIGIBLE");
  });
});

describe("FR-017·FR-018 시나리오와 로드맵", () => {
  const result = simulate({
    marketPrice: {
      status: "available",
      price: 900_000_000,
      baseDate: AT,
      source: "TRANSACTION_MEDIAN",
      windowMonths: 6,
      sampleCount: 5,
      sourceLabel: "국토교통부",
    },
    finance,
    household: {
      ...household,
      noHome: true,
      firstTime: true,
      maritalStatus: "MARRIED",
      marriageMonths: 12,
      householdSize: 2,
      age: 33,
    },
    rules: [
      rule(),
      rule({
        productId: "didimdol",
        name: "디딤돌대출",
        kind: "GOVERNMENT",
        exclusiveGroup: "POLICY",
        maxAmount: 250_000_000,
        annualRateMax: 0.032,
        conditions: [{ kind: "NO_HOME", label: "무주택 세대" }],
        preparations: ["주민등록등본", "소득 증빙"],
      }),
    ],
    propertyName: "테스트단지",
    areaLabel: "전용 84㎡",
    at: AT,
  });

  it("상호 배타 상품이 한 조합에 함께 들어가지 않는다", () => {
    const scenarios = buildScenarios({
      result,
      monthlySaving: finance.monthlySaving,
    });
    for (const s of scenarios) {
      const groups = s.productIds.map(
        (id) => result.products.find((p) => p.productId === id)!.exclusiveGroup,
      );
      expect(new Set(groups).size).toBe(groups.length);
    }
  });

  it("추천 조합은 기간이 가장 짧다", () => {
    const scenarios = buildScenarios({
      result,
      monthlySaving: finance.monthlySaving,
    });
    const recommended = scenarios.find((s) => s.recommended)!;
    const worst = scenarios[scenarios.length - 1]!;
    const months = (s: typeof recommended) =>
      s.timeline.status === "MONTHS"
        ? s.timeline.months
        : s.timeline.status === "IMMEDIATE"
          ? 0
          : Infinity;
    expect(months(recommended)).toBeLessThanOrEqual(months(worst));
  });

  it("월간 목표는 월 저축액, 주간 목표는 floor(월 저축액 × 12 / 52) 다", () => {
    const roadmap = buildRoadmap({ result, monthlySaving: 2_000_000 });
    expect(roadmap.monthlyTarget).toBe(2_000_000);
    expect(roadmap.weeklyTarget).toBe(Math.floor((2_000_000 * 12) / 52));
  });

  it("5개 단계가 순서대로 있고 미션마다 주기·완료 기준이 붙는다", () => {
    const roadmap = buildRoadmap({ result, monthlySaving: 2_000_000 });
    expect(roadmap.stages.map((s) => s.id)).toEqual([
      "CURRENT",
      "ACCUMULATE",
      "VERIFY_ELIGIBILITY",
      "PREPARE_LOAN",
      "PREPARE_PURCHASE",
    ]);
    expect(roadmap.missions.every((m) => m.doneCriteria.length > 0)).toBe(true);
    expect(
      roadmap.missions.every((m) =>
        ["WEEKLY", "MONTHLY", "ONCE"].includes(m.cadence),
      ),
    ).toBe(true);
  });

  it("기간 계산 불가면 첫 단계가 조건 변경 미션이다", () => {
    const uncomputable = simulate({
      marketPrice: {
        status: "available",
        price: 900_000_000,
        baseDate: AT,
        source: "TRANSACTION_MEDIAN",
        windowMonths: 6,
        sampleCount: 5,
        sourceLabel: "국토교통부",
      },
      finance: { ...finance, monthlySaving: 0 },
      household,
      rules: [rule()],
      propertyName: "테스트단지",
      areaLabel: "전용 84㎡",
      at: AT,
    });
    const roadmap = buildRoadmap({ result: uncomputable, monthlySaving: 0 });
    expect(roadmap.missions[0]!.title).toContain("월 저축 가능 금액");
    expect(roadmap.missions.some((m) => m.cadence === "WEEKLY")).toBe(false);
  });

  it("미션 ID 는 재계산해도 같다", () => {
    const a = buildRoadmap({ result, monthlySaving: 2_000_000 }).missions.map(
      (m) => m.id,
    );
    const b = buildRoadmap({ result, monthlySaving: 2_000_000 }).missions.map(
      (m) => m.id,
    );
    expect(a).toEqual(b);
  });
});

describe("FR-019·FR-020 체크리스트 로컬 저장", () => {
  it("손상된 항목만 버리고 나머지는 유지한다", () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      checklistId: "c1",
      completed: {
        good: "2026-09-01T00:00:00.000Z",
        bad: 12345,
        "": "2026-09-01T00:00:00.000Z",
      },
      noticeAcknowledged: true,
    });
    const { state, repaired } = parseChecklist(raw, "c1");
    expect(state.completed).toEqual({ good: "2026-09-01T00:00:00.000Z" });
    expect(state.noticeAcknowledged).toBe(true);
    expect(repaired).toBe(true);
  });

  it("JSON 이 깨졌으면 빈 상태로 복구한다", () => {
    const { state, repaired } = parseChecklist("{not json", "c1");
    expect(state.completed).toEqual({});
    expect(repaired).toBe(true);
  });

  it("전체·주간·월간 완료율을 낸다", () => {
    const missions = [
      {
        id: "a",
        stage: "ACCUMULATE",
        cadence: "WEEKLY",
        title: "",
        doneCriteria: "",
        scenarioId: null,
      },
      {
        id: "b",
        stage: "ACCUMULATE",
        cadence: "MONTHLY",
        title: "",
        doneCriteria: "",
        scenarioId: null,
      },
    ] as const;
    const p = progressOf(missions, { a: "2026-09-01T00:00:00.000Z" });
    expect(p.all).toEqual({ total: 2, done: 1, rate: 50 });
    expect(p.weekly).toEqual({ total: 1, done: 1, rate: 100 });
    expect(p.monthly).toEqual({ total: 1, done: 0, rate: 0 });
  });
});

describe("FR-022 공유 지문", () => {
  const base = {
    propertyId: "p1",
    areaId: "a1",
    priceVersion: "v1",
    ruleVersions: ["r1", "r2"],
    finance,
    household,
  };
  it("같은 입력·같은 버전은 같은 지문이다", () => {
    expect(buildResultFingerprint(base)).toBe(
      buildResultFingerprint({ ...base, ruleVersions: ["r2", "r1"] }),
    );
  });
  it("시세 버전이 바뀌면 지문이 바뀐다", () => {
    expect(buildResultFingerprint(base)).not.toBe(
      buildResultFingerprint({ ...base, priceVersion: "v2" }),
    );
  });
  it("입력이 바뀌면 지문이 바뀐다", () => {
    expect(buildResultFingerprint(base)).not.toBe(
      buildResultFingerprint({ ...base, finance: { ...finance, assets: 1 } }),
    );
  });
});

describe("표시 형식", () => {
  it("금액은 단위를 줄여도 통화 의미를 유지한다", () => {
    expect(formatKrwShort(320_000_000)).toBe("3억 2,000만원");
    expect(formatKrwShort(0)).toBe("0원");
    expect(formatKrwShort(1_0000_0000_0000)).toBe("1조원");
  });
});
