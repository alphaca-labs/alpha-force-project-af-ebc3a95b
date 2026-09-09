import Link from "next/link";
import { notFound } from "next/navigation";
import { formatKrw, formatKrwShort } from "@repo/domain";
import {
  SectionCard,
  SectionCardHeader,
} from "@/components/admin/section-card";
import { RuleVersionForm } from "@/components/admin/rule-version-form";
import { getRuleDetail, toIsoDate } from "@/lib/admin-data";
import { requireOperator, canWrite } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

type Condition = {
  readonly label?: string;
  readonly kind?: string;
  readonly value?: number;
};

/** ADM-R04 — 계산 규칙 상세(FR-028). 기존 버전은 불변이고 새 버전으로만 저장한다. */
export default async function RuleDetailPage({
  params,
}: {
  readonly params: Promise<{ ruleId: string }>;
}) {
  const principal = await requireOperator();
  const { ruleId } = await params;
  const version = await getRuleDetail(ruleId);
  if (!version) notFound();

  const conditions = (version.conditions as unknown as Condition[]) ?? [];
  const preparations = (version.preparations as unknown as string[]) ?? [];

  return (
    <div className="space-y-5">
      <nav aria-label="현재 위치" className="text-[12.5px] text-n-50">
        <Link href="/rules" className="underline underline-offset-4">
          대출·청약 규칙
        </Link>
        <span className="px-2">/</span>
        <strong className="text-foreground">
          {version.product.name} v{version.version}
        </strong>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[8fr_4fr]">
        <SectionCard>
          <SectionCardHeader
            title="새 버전 작성"
            description="기존 버전은 그대로 보존되고, 시행일부터 새 계산에만 적용됩니다."
          />
          <div className="p-[22px]">
            {canWrite(principal) ? (
              <RuleVersionForm
                baseVersionId={version.id}
                defaults={{
                  ltv: Number(version.ltv),
                  dsr: Number(version.dsr),
                  annualRateMin: Number(version.annualRateMin),
                  annualRateMax: Number(version.annualRateMax),
                  termYears: version.termYears,
                  maxAmount: Number(version.maxAmount),
                }}
              />
            ) : (
              <p className="text-[13.5px] text-n-50">읽기 전용 역할입니다.</p>
            )}
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard>
            <SectionCardHeader title="적용 영향 요약" />
            <dl className="space-y-2 p-[22px] text-[13.5px]">
              <div className="flex justify-between">
                <dt className="text-n-50">현재 버전</dt>
                <dd className="font-mono">
                  v{version.version} · LTV{" "}
                  {(Number(version.ltv) * 100).toFixed(0)}%
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-n-50">상품 한도</dt>
                <dd className="font-mono">
                  {formatKrw(Number(version.maxAmount))}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-n-50">공식 출처</dt>
                <dd className="text-right">{version.product.officialSource}</dd>
              </div>
              <p className="pt-2 text-n-50">
                이미 만들어진 공유 결과는 생성 당시 버전을 유지하므로 바뀌지
                않습니다.
              </p>
            </dl>
          </SectionCard>

          <SectionCard>
            <SectionCardHeader
              title="자격 조건"
              description="조건 편집은 다음 버전에서 다룹니다."
            />
            <ul className="divide-y divide-border">
              {conditions.length === 0 ? (
                <li className="p-[22px] text-[13.5px] text-n-50">
                  별도 자격 조건 없음
                </li>
              ) : (
                conditions.map((c, index) => (
                  <li
                    key={`${c.kind}-${index}`}
                    className="px-[22px] py-3 text-[13px]"
                  >
                    <div className="font-semibold">{c.label}</div>
                    <div className="font-mono text-[12px] text-n-50">
                      {c.kind}
                      {typeof c.value === "number"
                        ? ` · ${formatKrwShort(c.value)}`
                        : ""}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </SectionCard>

          <SectionCard>
            <SectionCardHeader title="준비 항목" />
            <ul className="divide-y divide-border">
              {preparations.map((p) => (
                <li key={p} className="px-[22px] py-2.5 text-[13px]">
                  {p}
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard>
            <SectionCardHeader title="버전 이력" />
            <ul className="divide-y divide-border">
              {version.product.versions.map((v) => (
                <li key={v.id} className="px-[22px] py-2.5 text-[13px]">
                  <span className="font-mono font-semibold">v{v.version}</span>{" "}
                  <span className="text-n-50">
                    {v.status} · {toIsoDate(v.effectiveFrom)} · LTV{" "}
                    {(Number(v.ltv) * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
