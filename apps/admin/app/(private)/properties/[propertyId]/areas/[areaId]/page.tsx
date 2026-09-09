import Link from "next/link";
import { notFound } from "next/navigation";
import { formatKrw, formatKrwShort } from "@repo/domain";
import {
  SectionCard,
  SectionCardHeader,
} from "@/components/admin/section-card";
import { PriceOverrideForm } from "@/components/admin/price-override-form";
import { getAreaAdminDetail, toIsoDate } from "@/lib/admin-data";
import { requireOperator, canWrite } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/** ADM-R02 — 면적 가격 상세(FR-026~027). */
export default async function AreaDetailPage({
  params,
}: {
  readonly params: Promise<{ propertyId: string; areaId: string }>;
}) {
  const principal = await requireOperator();
  const { areaId } = await params;
  const detail = await getAreaAdminDetail(areaId);
  if (!detail) notFound();

  const { area, price, auto, overrides } = detail;
  const latest = overrides[0];

  return (
    <div className="space-y-5">
      <nav aria-label="현재 위치" className="text-[12.5px] text-n-50">
        <Link href="/properties" className="underline underline-offset-4">
          매물 시세
        </Link>
        <span className="px-2">/</span>
        <span>{area.property.name}</span>
        <span className="px-2">/</span>
        <strong className="text-foreground">
          전용 {Number(area.areaM2)}㎡
        </strong>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[7fr_5fr]">
        <SectionCard>
          <SectionCardHeader
            title="확정 시세 편집"
            description="새 값을 저장하면 기존 값은 이력으로 남고 덮어쓰지 않습니다."
          />
          <div className="p-[22px]">
            {canWrite(principal) ? (
              <PriceOverrideForm
                areaId={area.id}
                defaultPrice={price.status === "available" ? price.price : 0}
                defaultBaseDate={
                  price.status === "available"
                    ? price.baseDate
                    : toIsoDate(new Date())
                }
                defaultSourceLabel={
                  price.status === "available"
                    ? price.sourceLabel
                    : "운영자 확정"
                }
                defaultMemo={latest?.memo ?? ""}
                expectedVersionAt={latest?.updatedAt.toISOString() ?? ""}
              />
            ) : (
              <p className="text-[13.5px] text-n-50">
                읽기 전용 역할입니다. 값을 바꾸려면 운영 권한이 필요합니다.
              </p>
            )}
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard>
            <SectionCardHeader title="현재 적용값" />
            <dl className="space-y-2 p-[22px] text-[13.5px]">
              <div className="flex justify-between">
                <dt className="text-n-50">적용 시세</dt>
                <dd className="font-mono">
                  {price.status === "available"
                    ? formatKrw(price.price)
                    : "시세 확인 불가"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-n-50">출처</dt>
                <dd>
                  {price.status === "available" ? price.sourceLabel : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-n-50">기준일</dt>
                <dd className="font-mono">
                  {price.status === "available" ? price.baseDate : "—"}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="text-n-50">자동 정규화 시세</dt>
                <dd className="font-mono">
                  {auto.status === "available"
                    ? `${formatKrwShort(auto.price)} (${auto.windowMonths}개월 ${auto.sampleCount}건)`
                    : "12개월 내 거래 없음"}
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard>
            <SectionCardHeader
              title="변경 이력"
              description="이미 사용된 버전은 수정하지 않습니다."
            />
            <ul className="divide-y divide-border">
              {overrides.length === 0 ? (
                <li className="p-[22px] text-[13.5px] text-n-50">
                  운영자 확정 시세 이력이 없습니다.
                </li>
              ) : (
                overrides.map((o) => (
                  <li key={o.id} className="px-[22px] py-3 text-[13px]">
                    <div className="font-mono font-semibold">
                      {formatKrw(Number(o.price))}
                    </div>
                    <div className="text-n-50">
                      {o.status} · 기준일 {toIsoDate(o.baseDate)} · 적용{" "}
                      {toIsoDate(o.effectiveFrom)}
                      {o.effectiveTo
                        ? ` ~ ${toIsoDate(o.effectiveTo)}`
                        : ""} · {o.createdBy.email}
                    </div>
                    {o.memo ? (
                      <div className="mt-1 text-n-50">{o.memo}</div>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
