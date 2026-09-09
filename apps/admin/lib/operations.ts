"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { database } from "@repo/database";
import { requireOperatorOrNull, canWrite } from "./auth/guard";
import { writeAudit } from "./audit";

import type { OperationState } from "./auth/form-state";

function parseWon(raw: string): number | null {
  const cleaned = raw.replace(/[,\s원]/gu, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isInteger(value) || value < 0 || value > 999_999_999_999)
    return null;
  return value;
}

/**
 * ADM-R02 — 운영자 확정 시세 저장(FR-026 · FR-027).
 *
 * 기존 버전을 덮어쓰지 않는다. 겹치는 기간의 활성 override 는 종료 처리하고 새 행을 만든다.
 * 제품 변경과 감사 기록은 한 트랜잭션에서 함께 성공해야 한다.
 */
export async function savePriceOverrideAction(
  _prev: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const principal = await requireOperatorOrNull();
  if (!principal)
    return {
      error: "세션이 만료되었습니다. 다시 로그인해 주세요.",
      notice: null,
    };
  if (!canWrite(principal))
    return { error: "이 작업에는 운영 권한이 필요합니다.", notice: null };

  const areaId = String(formData.get("areaId") ?? "");
  const price = parseWon(String(formData.get("price") ?? ""));
  const baseDate = String(formData.get("baseDate") ?? "");
  const sourceLabel = String(formData.get("sourceLabel") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim() || null;
  const effectiveFrom = String(formData.get("effectiveFrom") ?? "");
  const expectedVersionAt = String(formData.get("expectedVersionAt") ?? "");

  if (price === null)
    return {
      error: "가격은 0~999,999,999,999원 사이의 정수여야 합니다.",
      notice: null,
    };
  if (!baseDate || !effectiveFrom)
    return { error: "기준일과 적용 시작일을 입력해 주세요.", notice: null };
  if (!sourceLabel)
    return { error: "가격 출처를 입력해 주세요.", notice: null };

  const area = await database.propertyArea.findUnique({
    where: { id: areaId },
    include: { property: true },
  });
  if (!area) return { error: "대상 면적을 찾을 수 없습니다.", notice: null };

  // 동시 변경 충돌: 화면을 연 뒤 다른 운영자가 먼저 저장했는지 본다.
  const latest = await database.adminPriceOverride.findFirst({
    where: { areaId },
    orderBy: { updatedAt: "desc" },
  });
  if (
    latest &&
    expectedVersionAt &&
    latest.updatedAt.toISOString() !== expectedVersionAt
  ) {
    return {
      error:
        "다른 운영자가 먼저 저장했습니다. 화면을 새로 고쳐 변경 전후 값을 비교한 뒤 다시 저장해 주세요.",
      notice: null,
    };
  }

  await database.$transaction(async (tx) => {
    const superseded = await tx.adminPriceOverride.findMany({
      where: { areaId, status: "ACTIVE" },
    });
    await tx.adminPriceOverride.updateMany({
      where: { areaId, status: "ACTIVE" },
      // 과거 적용 이력은 물리 삭제하지 않고 종료 상태로 남긴다.
      data: { status: "EXPIRED", effectiveTo: new Date(effectiveFrom) },
    });
    const created = await tx.adminPriceOverride.create({
      data: {
        areaId,
        price: BigInt(price),
        baseDate: new Date(baseDate),
        sourceLabel,
        memo,
        effectiveFrom: new Date(effectiveFrom),
        status: "ACTIVE",
        createdById: principal.adminId,
      },
    });
    await writeAudit(tx, {
      principal,
      action: "PRICE_OVERRIDE_SAVED",
      targetType: "PropertyArea",
      targetId: areaId,
      before: superseded.map((o) => ({
        price: o.price.toString(),
        baseDate: o.baseDate.toISOString().slice(0, 10),
      })),
      after: {
        price: String(price),
        baseDate,
        sourceLabel,
        effectiveFrom,
        overrideId: created.id,
      },
    });
  });

  revalidatePath(`/properties/${area.propertyId}/areas/${areaId}`);
  revalidatePath("/properties");
  return {
    error: null,
    notice: "새 확정 시세를 저장했습니다. 기존 값은 이력으로 남았습니다.",
  };
}

/** ADM-R01 — 추천 노출 전환. */
export async function toggleFeaturedAction(formData: FormData): Promise<void> {
  const principal = await requireOperatorOrNull();
  if (!principal || !canWrite(principal)) redirect("/access-denied");
  const propertyId = String(formData.get("propertyId") ?? "");
  const property = await database.property.findUnique({
    where: { id: propertyId },
  });
  if (!property) return;

  await database.$transaction(async (tx) => {
    await tx.property.update({
      where: { id: propertyId },
      data: { featured: !property.featured },
    });
    await writeAudit(tx, {
      principal,
      action: "PROPERTY_FEATURED_TOGGLED",
      targetType: "Property",
      targetId: propertyId,
      before: { featured: property.featured },
      after: { featured: !property.featured },
    });
  });
  revalidatePath("/properties");
}

/**
 * ADM-R04 — 계산 규칙 새 버전 저장(FR-028).
 *
 * 기존 버전은 불변이다. 항상 새 버전을 만들고, 같은 상품의 활성 버전과 유효기간이 겹치면 막는다.
 */
export async function saveRuleVersionAction(
  _prev: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const principal = await requireOperatorOrNull();
  if (!principal)
    return {
      error: "세션이 만료되었습니다. 다시 로그인해 주세요.",
      notice: null,
    };
  if (!canWrite(principal))
    return { error: "이 작업에는 운영 권한이 필요합니다.", notice: null };

  const baseVersionId = String(formData.get("baseVersionId") ?? "");
  const base = await database.loanRuleVersion.findUnique({
    where: { id: baseVersionId },
    include: { product: true },
  });
  if (!base) return { error: "기준 버전을 찾을 수 없습니다.", notice: null };

  const ltv = Number(formData.get("ltv"));
  const dsr = Number(formData.get("dsr"));
  const rateMin = Number(formData.get("annualRateMin"));
  const rateMax = Number(formData.get("annualRateMax"));
  const termYears = Number(formData.get("termYears"));
  const maxAmount = parseWon(String(formData.get("maxAmount") ?? ""));
  const effectiveFrom = String(formData.get("effectiveFrom") ?? "");
  const effectiveToRaw = String(formData.get("effectiveTo") ?? "");

  if (
    ![ltv, dsr, rateMin, rateMax].every(
      (v) => Number.isFinite(v) && v >= 0 && v <= 1,
    )
  ) {
    return {
      error: "LTV·DSR·금리는 0~1 사이의 비율로 입력해 주세요.",
      notice: null,
    };
  }
  if (rateMin > rateMax)
    return { error: "최저 금리가 최고 금리보다 큽니다.", notice: null };
  if (!Number.isInteger(termYears) || termYears <= 0 || termYears > 50) {
    return {
      error: "상환 기간은 1~50년 사이의 정수여야 합니다.",
      notice: null,
    };
  }
  if (maxAmount === null)
    return { error: "상품 최대 한도를 확인해 주세요.", notice: null };
  if (!effectiveFrom)
    return { error: "새 버전 시행일을 입력해 주세요.", notice: null };

  const from = new Date(effectiveFrom);
  const to = effectiveToRaw ? new Date(effectiveToRaw) : null;
  if (to && to <= from)
    return { error: "종료일은 시행일보다 뒤여야 합니다.", notice: null };

  // 같은 상품의 활성 버전과 유효기간이 겹치면 활성화하지 않는다.
  const overlapping = await database.loanRuleVersion.findMany({
    where: { productId: base.productId, status: "ACTIVE" },
  });
  const conflict = overlapping.some((v) => {
    const vFrom = v.effectiveFrom;
    const vTo = v.effectiveTo;
    return (!vTo || vTo > from) && (!to || to > vFrom);
  });
  if (conflict) {
    return {
      error:
        "같은 상품의 활성 버전과 유효기간이 겹칩니다. 기존 버전의 종료일을 먼저 정해 주세요.",
      notice: null,
    };
  }

  const nextVersion =
    (
      await database.loanRuleVersion.aggregate({
        where: { productId: base.productId },
        _max: { version: true },
      })
    )._max.version ?? 0;

  await database.$transaction(async (tx) => {
    const created = await tx.loanRuleVersion.create({
      data: {
        productId: base.productId,
        version: nextVersion + 1,
        ltv,
        dsr,
        annualRateMin: rateMin,
        annualRateMax: rateMax,
        termYears,
        maxAmount: BigInt(maxAmount),
        conditions: base.conditions as never,
        preparations: base.preparations as never,
        effectiveFrom: from,
        effectiveTo: to,
        status: from > new Date() ? "SCHEDULED" : "ACTIVE",
        createdById: principal.adminId,
      },
    });
    await writeAudit(tx, {
      principal,
      action: "RULE_VERSION_CREATED",
      targetType: "LoanRuleVersion",
      targetId: created.id,
      before: {
        version: base.version,
        ltv: base.ltv.toString(),
        dsr: base.dsr.toString(),
        maxAmount: base.maxAmount.toString(),
      },
      after: {
        version: created.version,
        ltv,
        dsr,
        maxAmount: String(maxAmount),
        effectiveFrom,
      },
    });
  });

  revalidatePath("/rules");
  revalidatePath(`/rules/${baseVersionId}`);
  return {
    error: null,
    notice: `v${nextVersion + 1} 을 만들었습니다. 기존 버전은 그대로 보존됩니다.`,
  };
}
