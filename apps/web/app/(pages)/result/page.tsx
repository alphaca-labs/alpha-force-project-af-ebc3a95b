import Link from "next/link";
import { redirect } from "next/navigation";
import { formatKrw, formatKrwShort, formatMonths } from "@repo/domain";
import { CustomerPage, ScreenHead } from "@/components/customer/shell";
import { CharacterPanel } from "@/components/customer/character-panel";
import { AdjustmentPanel } from "@/components/customer/adjustment-panel";
import { ResultOverlays } from "@/components/customer/result-overlays";
import { readSession } from "@/lib/session";
import { buildSimulation } from "@/lib/simulation";

export const dynamic = "force-dynamic";

/** WEB-03 — 격차 결과(FR-007~014) + WEB-O01/O02 오버레이. */
export default async function ResultPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ overlay?: string }>;
}) {
  const session = await readSession();
  const built = await buildSimulation(session);
  if (!built.ok) {
    if (built.failure.kind === "NO_FINANCE") redirect("/finance");
    redirect("/");
  }
  const { detail, result, roadmap } = built.bundle;
  const overlay = (await searchParams).overlay;

  return (
    <CustomerPage current="/result">
      <ScreenHead
        code="WEB-03"
        title="격차 결과"
        description="부족액은 숨기지 않고, 바꿀 수 있는 조건은 바로 옆에 둡니다."
        action={
          <Link className="button" href="/result?overlay=share">
            공유
          </Link>
        }
      />

      {result.staleData ? (
        <div className="notice notice-warning" role="status">
          <strong>오래된 데이터 경고</strong>
          <br />
          적용한 시세 기준일이 {result.priceBaseDate}로 30일 이상 지났습니다.
          실제 가격과 차이가 클 수 있어요.
        </div>
      ) : null}

      <div className="result-layout">
        <div className="result-main stack">
          <section className="card-strong card-pear gap-hero">
            <p className="gap-label">목표까지 부족한 돈</p>
            <strong id="gap-number" className="gap-number">
              {formatKrwShort(result.shortfall)}
            </strong>
            <p className="hero-kicker">
              지금 조건이면 약{" "}
              <strong className="numeric">
                {formatMonths(result.timeline)}
              </strong>
              . 목표 달성률은{" "}
              <strong className="numeric">{result.achievementRate}%</strong>
              입니다.
            </p>
            <dl className="stat-strip">
              <div className="stat">
                <dt>목표 가격</dt>
                <dd>{formatKrwShort(result.targetPrice)}</dd>
              </div>
              <div className="stat">
                <dt>가능 대출</dt>
                <dd>{formatKrwShort(result.loanCapacity)}</dd>
              </div>
              <div className="stat">
                <dt>보유 자산</dt>
                <dd>{formatKrwShort(result.assets)}</dd>
              </div>
            </dl>
            <p className="subtle">
              {detail.property.name} {detail.area.label} · 기준일{" "}
              {result.priceBaseDate} · {result.priceSourceLabel}
            </p>
          </section>

          <section className="card">
            <CharacterPanel
              state={result.character}
              label={result.characterLabel}
              message={result.raidMessage}
              equipment={result.equipment}
            />
          </section>

          <section className="card stack-tight">
            <div className="cluster-between">
              <strong>절망 지수</strong>
              <span className="numeric">
                {result.despairIndex} / 100 · {result.characterLabel}
              </span>
            </div>
            <div
              className="meter"
              role="progressbar"
              aria-label="절망 지수"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={result.despairIndex}
            >
              <div
                className="meter-fill"
                style={{ ["--progress" as string]: `${result.despairIndex}%` }}
              />
            </div>
            <p className="subtle">
              예상 개월 수를 12로 나눠 올린 값입니다(최대 100). 즉시 가능은
              0입니다.
            </p>
          </section>

          <section className="card stack-tight">
            <h2>계산에 사용한 대출 조건</h2>
            <ul className="eligibility-list">
              {result.products.map((product) => (
                <li
                  className="eligibility-item cluster-between"
                  key={product.productId}
                >
                  <span>
                    <strong>{product.name}</strong>
                    <br />
                    <span className="subtle numeric">
                      LTV{" "}
                      {(
                        (product.ltvCap / Math.max(result.targetPrice, 1)) *
                        100
                      ).toFixed(0)}
                      % 한도 {formatKrwShort(product.ltvCap)} · DSR 한도{" "}
                      {formatKrwShort(product.dsrCap)} · 상품 한도{" "}
                      {formatKrwShort(product.productCap)} · 금리{" "}
                      {(product.annualRateMin * 100).toFixed(1)}~
                      {(product.annualRateMax * 100).toFixed(1)}% ·{" "}
                      {product.termYears}년 · 기준일 {product.effectiveFrom}
                    </span>
                  </span>
                  <span
                    className={`status-badge ${
                      product.status === "ELIGIBLE"
                        ? "status-success"
                        : product.status === "CHECK_NEEDED"
                          ? "status-warning"
                          : "status-danger"
                    }`}
                  >
                    {product.status === "ELIGIBLE"
                      ? "가능"
                      : product.status === "CHECK_NEEDED"
                        ? "확인 필요"
                        : "어려움"}{" "}
                    {formatKrw(product.estimatedAmount)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="subtle">
              합산에 실제로 쓰인 상품:{" "}
              {result.selectedProductIds.length > 0
                ? result.selectedProductIds.join(", ")
                : "없음"}
              . 상호 배타 상품은 가장 큰 한도 하나만 사용합니다.
            </p>
          </section>
        </div>

        <aside className="result-controls stack">
          <AdjustmentPanel
            initialMonthlySaving={session!.finance!.monthlySaving}
            initialAnnualIncome={session!.finance!.annualIncome}
            areaId={detail.area.id}
            areas={detail.siblings.map((a) => ({
              id: a.id,
              label: a.label,
              available: a.price.status === "available",
            }))}
          />
          <div className="cluster">
            <Link className="button" href="/result?overlay=image">
              이미지 저장
            </Link>
            <Link className="button" href="/result?overlay=share">
              링크 공유
            </Link>
          </div>
          <Link className="button button-accent button-block" href="/roadmap">
            내 로드맵 만들기
          </Link>
        </aside>
      </div>

      <section className="section-block">
        <h2>엉뚱하지만 계산되는 우회로</h2>
        <div className="detour-grid">
          <article className="card card-sky detour-card">
            <span className="tag">{result.detours[0]!.title}</span>
            <h3>{result.detours[0]!.headline}</h3>
            <p>{result.detours[0]!.detail}</p>
            <p className="subtle">{result.detours[0]!.disclaimer}</p>
          </article>
          <div className="detour-stack">
            {result.detours.slice(1).map((card) => (
              <article className="card detour-row" key={card.id}>
                <div>
                  <strong>
                    {card.title} — {card.headline}
                  </strong>
                  <br />
                  <span className="subtle">{card.detail}</span>
                  <br />
                  <span className="subtle">{card.disclaimer}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block">
        <h2>계산의 한계</h2>
        <ul className="mission-list">
          {result.disclaimers.map((line) => (
            <li className="mission-item" key={line}>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <ResultOverlays
        overlay={
          overlay === "image" ? "image" : overlay === "share" ? "share" : null
        }
        summary={{
          propertyName: detail.property.name,
          areaLabel: detail.area.label,
          shortfall: formatKrwShort(result.shortfall),
          timeline: formatMonths(result.timeline),
          achievementRate: result.achievementRate,
          despairIndex: result.despairIndex,
          character: result.character,
          characterLabel: result.characterLabel,
          raidMessage: result.raidMessage,
          equipment: result.equipment,
          baseDate: result.priceBaseDate,
          recommendedScenario:
            roadmap.scenarios
              .find((s) => s.recommended)
              ?.productNames.join(" + ") ?? "저축만",
        }}
      />
    </CustomerPage>
  );
}
