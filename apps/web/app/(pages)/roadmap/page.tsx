import Link from "next/link";
import { redirect } from "next/navigation";
import { formatKrwShort, formatMonths, scenarioSummary } from "@repo/domain";
import { CustomerPage, ScreenHead } from "@/components/customer/shell";
import { HouseholdForm } from "@/components/customer/household-form";
import { readSession } from "@/lib/session";
import { buildSimulation } from "@/lib/simulation";
import { listSubscriptionRules } from "@/lib/repository";

export const dynamic = "force-dynamic";

const STATUS_BADGE = {
  ELIGIBLE: { className: "status-success", label: "가능" },
  CHECK_NEEDED: { className: "status-warning", label: "확인 필요" },
  INELIGIBLE: { className: "status-danger", label: "어려움" },
} as const;

/** WEB-04 — 맞춤 로드맵(FR-015~018). */
export default async function RoadmapPage() {
  const session = await readSession();
  const built = await buildSimulation(session);
  if (!built.ok) {
    if (built.failure.kind === "NO_FINANCE") redirect("/finance");
    redirect("/");
  }
  const { result, roadmap, detail } = built.bundle;
  const subscriptionRules = await listSubscriptionRules();

  const total = Math.max(result.targetPrice, 1);
  const assetsPct = Math.round((result.assets / total) * 100);
  const loanPct = Math.round((result.loanCapacity / total) * 100);
  const gapPct = Math.max(100 - assetsPct - loanPct, 0);

  return (
    <CustomerPage current="/roadmap">
      <ScreenHead
        code="WEB-04"
        title="맞춤 로드맵"
        description="자격은 단정하지 않고, 오늘 할 일은 작고 분명하게 나눕니다."
      />
      <div className="roadmap-layout">
        <aside className="stack">
          <section className="card-strong card-pear">
            <span className="tag">자격 빠른 점검</span>
            <h2>세 가지 상태로 봐요</h2>
            <ul className="eligibility-list">
              {result.products.map((product) => (
                <li
                  className="eligibility-item cluster-between"
                  key={product.productId}
                >
                  <span>
                    <strong>{product.name}</strong>
                    <br />
                    <span className="subtle">
                      {product.conditions.length === 0
                        ? "별도 자격 조건 없음"
                        : product.conditions
                            .map(
                              (c) =>
                                `${c.label}: ${c.verdict === "MET" ? "충족" : c.verdict === "UNMET" ? "미충족" : `확인 필요(${c.missingField})`}`,
                            )
                            .join(" · ")}
                    </span>
                    <br />
                    <span className="subtle">
                      공식 확인: {product.officialSource}
                    </span>
                  </span>
                  <span
                    className={`status-badge ${STATUS_BADGE[product.status].className}`}
                  >
                    {STATUS_BADGE[product.status].label}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card stack">
            <h3>청약 우대 확인 항목</h3>
            <ul className="eligibility-list">
              {subscriptionRules.map((rule) => (
                <li className="eligibility-item" key={rule.code}>
                  <strong>{rule.name}</strong>
                  <br />
                  <span className="subtle">
                    준비: {rule.preparations.join(" · ")}
                  </span>
                  <br />
                  <span className="subtle">
                    공식 확인: {rule.officialSource}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card stack">
            <h3>자금 조합</h3>
            <div
              className="funding-bar"
              aria-label={`보유 자산 ${assetsPct}%, 가능 대출 ${loanPct}%, 부족액 ${gapPct}%`}
            >
              <span
                className="funding-assets"
                style={{ flexGrow: assetsPct }}
              />
              <span className="funding-loan" style={{ flexGrow: loanPct }} />
              <span className="funding-gap" style={{ flexGrow: gapPct }} />
            </div>
            <div className="legend">
              <span className="asset">
                자산 {formatKrwShort(result.assets)}
              </span>
              <span className="loan">
                대출 {formatKrwShort(result.loanCapacity)}
              </span>
              <span className="gap">
                부족 {formatKrwShort(result.shortfall)}
              </span>
            </div>
          </section>

          <div className="notice notice-warning">
            <strong>{result.priceBaseDate} 기준</strong>
            <br />
            정책 자격은 신청 시점과 개인 조건에 따라 달라질 수 있습니다. 실제
            실행에는 기관 심사가 필요합니다.
          </div>

          <HouseholdForm defaults={session!.household} />
        </aside>

        <section className="card stack">
          <div>
            <span className="tag">{formatMonths(result.timeline)} 계획</span>
            <h2>{detail.property.name} 레이드, 이번 주부터</h2>
          </div>

          <section className="stack-tight">
            <h3>조달 조합 비교</h3>
            <ul className="mission-list">
              {roadmap.scenarios.map((scenario) => (
                <li className="mission-item" key={scenario.id}>
                  <span>
                    {scenario.recommended ? (
                      <span className="status-badge status-success">추천</span>
                    ) : null}{" "}
                    {scenarioSummary(scenario)}
                    <br />
                    <small className="muted">
                      잔여 부족 {formatKrwShort(scenario.remainingShortfall)} ·
                      연간 원리금 {formatKrwShort(scenario.annualRepayment)}
                      {scenario.includesCheckNeeded
                        ? " · 확인 필요 상품 포함"
                        : ""}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <div className="timeline">
            {roadmap.stages.map((stage) => (
              <article className="timeline-step" key={stage.id}>
                <span className="status-badge status-info">{stage.title}</span>
                <h3>{stage.summary}</h3>
                {stage.missions.length === 0 ? (
                  <p className="subtle">이 단계에서 지금 할 일은 없습니다.</p>
                ) : (
                  <ul className="mission-list">
                    {stage.missions.map((mission) => (
                      <li className="mission-item" key={mission.id}>
                        <span>
                          <span className="status-badge">
                            {mission.cadence === "WEEKLY"
                              ? "주간"
                              : mission.cadence === "MONTHLY"
                                ? "월간"
                                : "1회"}
                          </span>{" "}
                          {mission.title}
                          <br />
                          <small className="muted">
                            완료 기준: {mission.doneCriteria}
                          </small>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>

          <p className="subtle">
            월간 목표 {formatKrwShort(roadmap.monthlyTarget)} · 주간 목표{" "}
            {formatKrwShort(roadmap.weeklyTarget)}
          </p>

          <Link className="button button-accent button-block" href="/checklist">
            체크리스트 시작
          </Link>
        </section>
      </div>
    </CustomerPage>
  );
}
