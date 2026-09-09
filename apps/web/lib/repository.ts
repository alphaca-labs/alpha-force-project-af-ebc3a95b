import "server-only";
import { database } from "@repo/database";
import {
  areaLabel,
  resolveMarketPrice,
  type EligibilityCondition,
  type LoanProductRule,
  type MarketPrice,
} from "@repo/domain";

/**
 * DB 경계. `BigInt`·`Decimal` 은 여기서만 다루고, 밖으로는 도메인 타입(number)만 내보낸다.
 * 금액 상한은 999,999,999,999원이라 `Number` 안전 정수 범위 안이다.
 */
function toNumber(value: bigint | { toString(): string } | number): number {
  if (typeof value === "number") return value;
  return Number(value.toString());
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export type PropertySummary = {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly region: string;
  readonly type: "APARTMENT" | "OFFICETEL";
  readonly typeLabel: string;
  readonly areas: readonly AreaSummary[];
  /** 대표(가장 작은 평형) 가격 표시. 시세가 없으면 null. */
  readonly headlinePrice: number | null;
};

export type AreaSummary = {
  readonly id: string;
  readonly areaM2: number;
  readonly label: string;
  readonly price: MarketPrice;
};

const TYPE_LABEL = { APARTMENT: "아파트", OFFICETEL: "오피스텔" } as const;

/** FR-001 — 추천은 최대 8개. */
export const FEATURED_LIMIT = 8;
/** FR-002 — 검색 결과는 최대 20개. */
export const SEARCH_LIMIT = 20;

async function hydrate(
  properties: readonly {
    id: string;
    name: string;
    address: string;
    region: string;
    type: "APARTMENT" | "OFFICETEL";
  }[],
): Promise<readonly PropertySummary[]> {
  if (properties.length === 0) return [];
  const ids = properties.map((p) => p.id);
  const areas = await database.propertyArea.findMany({
    where: { propertyId: { in: ids }, active: true },
    orderBy: { areaM2: "asc" },
    include: {
      transactions: {
        where: { cancelled: false },
        orderBy: { contractDate: "desc" },
        take: 200,
      },
      overrides: {
        where: { status: "ACTIVE" },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
    },
  });
  const at = toIsoDate(new Date());

  const byProperty = new Map<string, AreaSummary[]>();
  for (const area of areas) {
    const override = area.overrides[0];
    const price = resolveMarketPrice({
      at,
      transactions: area.transactions.map((t) => ({
        amount: toNumber(t.amount),
        contractDate: toIsoDate(t.contractDate),
        cancelled: t.cancelled,
      })),
      override: override
        ? {
            price: toNumber(override.price),
            baseDate: toIsoDate(override.baseDate),
            sourceLabel: override.sourceLabel,
            effectiveFrom: toIsoDate(override.effectiveFrom),
            effectiveTo: override.effectiveTo
              ? toIsoDate(override.effectiveTo)
              : null,
          }
        : null,
    });
    const m2 = toNumber(area.areaM2);
    const list = byProperty.get(area.propertyId) ?? [];
    list.push({ id: area.id, areaM2: m2, label: areaLabel(m2), price });
    byProperty.set(area.propertyId, list);
  }

  return properties.map((p) => {
    const list = byProperty.get(p.id) ?? [];
    const first = list.find((a) => a.price.status === "available");
    return {
      ...p,
      typeLabel: TYPE_LABEL[p.type],
      areas: list,
      headlinePrice:
        first && first.price.status === "available" ? first.price.price : null,
    };
  });
}

/** FR-001 — 활성 추천 매물을 운영 순서대로 최대 8개. */
export async function listFeaturedProperties(): Promise<
  readonly PropertySummary[]
> {
  const properties = await database.property.findMany({
    where: { active: true, featured: true },
    orderBy: [{ featuredOrder: "asc" }, { name: "asc" }],
    take: FEATURED_LIMIT,
    select: { id: true, name: true, address: true, region: true, type: true },
  });
  return hydrate(properties);
}

/** FR-002 — 2자 이상 검색, 관련도(이름 시작 일치 우선)순 최대 20개. */
export async function searchProperties(
  query: string,
  type?: "APARTMENT" | "OFFICETEL",
): Promise<readonly PropertySummary[]> {
  const properties = await database.property.findMany({
    where: {
      active: true,
      ...(type ? { type } : {}),
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { region: { contains: query, mode: "insensitive" } },
        { address: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: SEARCH_LIMIT,
    select: { id: true, name: true, address: true, region: true, type: true },
  });
  const scored = [...properties].sort((a, b) => {
    const score = (p: typeof a) =>
      p.name.startsWith(query) ? 0 : p.name.includes(query) ? 1 : 2;
    return score(a) - score(b) || a.name.localeCompare(b.name, "ko");
  });
  return hydrate(scored);
}

export type AreaDetail = {
  readonly area: AreaSummary;
  readonly property: Omit<PropertySummary, "areas" | "headlinePrice">;
  readonly siblings: readonly AreaSummary[];
};

/** 선택한 평형과 같은 단지의 다른 평형(FR-013.AC2 평형 전환). */
export async function getAreaDetail(
  areaId: string,
): Promise<AreaDetail | null> {
  const area = await database.propertyArea.findUnique({
    where: { id: areaId },
    include: { property: true },
  });
  if (!area) return null;
  const [full] = await hydrate([
    {
      id: area.property.id,
      name: area.property.name,
      address: area.property.address,
      region: area.property.region,
      type: area.property.type,
    },
  ]);
  if (!full) return null;
  const target = full.areas.find((a) => a.id === areaId);
  if (!target) return null;
  const { areas: _areas, headlinePrice: _headline, ...property } = full;
  return { area: target, property, siblings: full.areas };
}

/** FR-028 — 활성 대출 규칙 버전을 도메인 규칙으로 변환한다. */
export async function listLoanRules(): Promise<readonly LoanProductRule[]> {
  const versions = await database.loanRuleVersion.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ productId: "asc" }, { version: "desc" }],
    include: { product: true },
  });
  const seen = new Set<string>();
  const rules: LoanProductRule[] = [];
  for (const v of versions) {
    if (seen.has(v.productId)) continue; // 상품별 최신 활성 버전 하나만.
    seen.add(v.productId);
    rules.push({
      productId: v.product.code,
      name: v.product.name,
      kind: v.product.kind,
      ltv: Number(v.ltv),
      dsr: Number(v.dsr),
      annualRateMin: Number(v.annualRateMin),
      annualRateMax: Number(v.annualRateMax),
      termYears: v.termYears,
      maxAmount: toNumber(v.maxAmount),
      exclusiveGroup: v.product.exclusiveGroup,
      conditions: v.conditions as unknown as readonly EligibilityCondition[],
      preparations: v.preparations as unknown as readonly string[],
      officialSource: v.product.officialSource,
      effectiveFrom: toIsoDate(v.effectiveFrom),
      effectiveTo: v.effectiveTo ? toIsoDate(v.effectiveTo) : null,
      version: v.version,
    });
  }
  return rules;
}

/** 결과 지문에 쓰는 규칙 버전 식별자. 규칙이 바뀌면 공유 URL 도 새로 만들어진다. */
export function ruleVersionIds(
  rules: readonly LoanProductRule[],
): readonly string[] {
  return rules.map((r) => `${r.productId}@${r.version}`);
}

/** FR-016.AC3 — 청약 우대 규칙. */
export async function listSubscriptionRules() {
  const rows = await database.subscriptionRuleVersion.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ code: "asc" }, { version: "desc" }],
  });
  const seen = new Set<string>();
  return rows
    .filter((r) => (seen.has(r.code) ? false : (seen.add(r.code), true)))
    .map((r) => ({
      code: r.code,
      name: r.name,
      conditions: r.conditions as unknown as readonly EligibilityCondition[],
      preparations: r.preparations as unknown as readonly string[],
      officialSource: r.officialSource,
      effectiveFrom: toIsoDate(r.effectiveFrom),
      effectiveTo: r.effectiveTo ? toIsoDate(r.effectiveTo) : null,
    }));
}

export { toIsoDate, toNumber };
