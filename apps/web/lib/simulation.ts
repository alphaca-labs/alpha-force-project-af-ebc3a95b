import "server-only";
import {
  buildResultFingerprint,
  buildRoadmap,
  simulate,
  type Roadmap,
  type SimulationResult,
} from "@repo/domain";
import {
  getAreaDetail,
  listLoanRules,
  ruleVersionIds,
  toIsoDate,
  type AreaDetail,
} from "./repository";
import type { SimulationSession } from "./session";

export type SimulationBundle = {
  readonly detail: AreaDetail;
  readonly result: SimulationResult;
  readonly roadmap: Roadmap;
  readonly fingerprint: string;
};

export type SimulationFailure =
  | { readonly kind: "NO_SELECTION" }
  | { readonly kind: "NO_FINANCE"; readonly areaId: string }
  | { readonly kind: "AREA_NOT_FOUND" }
  | { readonly kind: "PRICE_UNAVAILABLE"; readonly detail: AreaDetail };

/**
 * 현재 세션으로 결과와 로드맵을 한 번에 만든다.
 *
 * 재계산 중 이전 입력과 새 시세를 섞지 않는 것이 계약이다(FR-013 규칙). 그래서 결과·로드맵·
 * 지문은 **한 호출 안에서 같은 입력·같은 규칙 버전**으로 함께 만든다.
 */
export async function buildSimulation(
  session: SimulationSession | null,
): Promise<
  | { readonly ok: true; readonly bundle: SimulationBundle }
  | { readonly ok: false; readonly failure: SimulationFailure }
> {
  if (!session) return { ok: false, failure: { kind: "NO_SELECTION" } };
  const detail = await getAreaDetail(session.areaId);
  if (!detail) return { ok: false, failure: { kind: "AREA_NOT_FOUND" } };
  if (detail.area.price.status !== "available") {
    return { ok: false, failure: { kind: "PRICE_UNAVAILABLE", detail } };
  }
  if (!session.finance)
    return {
      ok: false,
      failure: { kind: "NO_FINANCE", areaId: session.areaId },
    };

  const rules = await listLoanRules();
  const at = toIsoDate(new Date());
  const result = simulate({
    marketPrice: detail.area.price,
    finance: session.finance,
    household: session.household,
    rules,
    propertyName: detail.property.name,
    areaLabel: detail.area.label,
    at,
  });
  const roadmap = buildRoadmap({
    result,
    monthlySaving: session.finance.monthlySaving,
  });
  const fingerprint = buildResultFingerprint({
    propertyId: detail.property.id,
    areaId: detail.area.id,
    priceVersion: `${detail.area.price.source}:${detail.area.price.baseDate}:${detail.area.price.price}`,
    ruleVersions: ruleVersionIds(rules),
    finance: session.finance,
    household: session.household,
  });
  return { ok: true, bundle: { detail, result, roadmap, fingerprint } };
}

/** 공유 스냅숏에 담는 공개 payload. 원본 재무 입력 중 민감 축은 넣지 않는다(FR-022 규칙). */
export function sharePayload(bundle: SimulationBundle) {
  return {
    createdAt: new Date().toISOString(),
    property: {
      name: bundle.detail.property.name,
      region: bundle.detail.property.region,
      typeLabel: bundle.detail.property.typeLabel,
      areaLabel: bundle.detail.area.label,
    },
    price: {
      value: bundle.result.targetPrice,
      baseDate: bundle.result.priceBaseDate,
      sourceLabel: bundle.result.priceSourceLabel,
    },
    finance: {
      assets: bundle.result.assets,
      loanCapacity: bundle.result.loanCapacity,
      shortfall: bundle.result.shortfall,
      achievementRate: bundle.result.achievementRate,
    },
    timeline: bundle.result.timeline,
    character: {
      state: bundle.result.character,
      label: bundle.result.characterLabel,
      despairIndex: bundle.result.despairIndex,
      equipment: bundle.result.equipment,
      raidMessage: bundle.result.raidMessage,
    },
    detours: bundle.result.detours,
    roadmap: {
      monthlyTarget: bundle.roadmap.monthlyTarget,
      weeklyTarget: bundle.roadmap.weeklyTarget,
      recommendedScenarioId: bundle.roadmap.recommendedScenarioId,
      missions: bundle.roadmap.missions.slice(0, 12),
      scenarios: bundle.roadmap.scenarios.slice(0, 3),
    },
    disclaimers: bundle.result.disclaimers,
  };
}

export type SharePayload = ReturnType<typeof sharePayload>;
