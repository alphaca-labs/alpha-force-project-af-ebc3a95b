import Link from "next/link";
import { database } from "@repo/database";
import { hashToken } from "@repo/security";
import { formatKrwShort, formatMonths } from "@repo/domain";
import { CustomerPage, ScreenHead } from "@/components/customer/shell";
import { CharacterPanel } from "@/components/customer/character-panel";
import type { SharePayload } from "@/lib/simulation";

export const dynamic = "force-dynamic";

/**
 * WEB-06 — 공유 결과(FR-024).
 *
 * 저장된 스냅숏만 읽는다. 현재 시세·규칙으로 다시 계산하지 않는다. 존재하지 않는 토큰과
 * 읽을 수 없는 토큰은 같은 «링크 확인 불가» 상태로 붕괴시켜 존재 여부를 노출하지 않는다.
 */
export default async function SharePage({
  params,
}: {
  readonly params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let payload: SharePayload | null = null;
  try {
    const snapshot = await database.shareSnapshot.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    payload = (snapshot?.payload as SharePayload | undefined) ?? null;
  } catch {
    payload = null;
  }

  if (!payload) {
    return (
      <CustomerPage current="/share">
        <ScreenHead
          code="WEB-06"
          title="공유 결과"
          description="이 링크로는 결과를 열 수 없습니다."
        />
        <section className="card-strong stack">
          <span className="status-badge status-danger">링크 확인 불가</span>
          <h2>결과를 찾을 수 없어요</h2>
          <p>
            주소가 잘못되었거나 더 이상 열 수 없는 링크입니다. 새로 계산해서
            나만의 결과를 만들어 보세요.
          </p>
          <Link className="button button-primary" href="/">
            새 시뮬레이션 시작
          </Link>
        </section>
      </CustomerPage>
    );
  }

  const createdDate = payload.createdAt.slice(0, 10);

  return (
    <CustomerPage current="/share">
      <ScreenHead
        code="WEB-06"
        title="공유 결과"
        description={`${createdDate}에 만든 결과예요. 이 링크의 숫자는 이후에도 바뀌지 않습니다.`}
      />
      <div className="split-layout">
        <section className="card-strong card-pear">
          <span className="share-page-badge">공유된 불변 결과</span>
          <h2>
            {payload.property.name} {payload.property.areaLabel}
          </h2>
          <p className="gap-label">목표까지 부족한 돈</p>
          <strong className="gap-number">
            {formatKrwShort(payload.finance.shortfall)}
          </strong>
          <CharacterPanel
            state={payload.character.state}
            label={payload.character.label}
            message={payload.character.raidMessage}
            equipment={payload.character.equipment}
          />
          <dl className="stat-strip">
            <div className="stat">
              <dt>목표 가격</dt>
              <dd>{formatKrwShort(payload.price.value)}</dd>
            </div>
            <div className="stat">
              <dt>예상 기간</dt>
              <dd>{formatMonths(payload.timeline)}</dd>
            </div>
            <div className="stat">
              <dt>달성률</dt>
              <dd>{payload.finance.achievementRate}%</dd>
            </div>
            <div className="stat">
              <dt>생성일</dt>
              <dd>{createdDate}</dd>
            </div>
          </dl>
          <p className="subtle">
            가격 기준일 {payload.price.baseDate} · {payload.price.sourceLabel}
          </p>
        </section>

        <aside className="stack">
          <section className="card">
            <h2>공유된 로드맵</h2>
            <p className="subtle">
              추천 조합: {payload.roadmap.recommendedScenarioId ?? "저축만"} ·
              월간 목표 {formatKrwShort(payload.roadmap.monthlyTarget)} · 주간
              목표 {formatKrwShort(payload.roadmap.weeklyTarget)}
            </p>
            <ul className="mission-list">
              {payload.roadmap.missions.map((mission) => (
                <li className="mission-item" key={mission.id}>
                  <strong>
                    {mission.cadence === "WEEKLY"
                      ? "주간"
                      : mission.cadence === "MONTHLY"
                        ? "월간"
                        : "1회"}
                  </strong>
                  <span>{mission.title}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h2>우회 시나리오</h2>
            <ul className="mission-list">
              {payload.detours.map((card) => (
                <li className="mission-item" key={card.id}>
                  <strong>{card.title}</strong>
                  <span>{card.headline}</span>
                  <small className="muted">{card.detail}</small>
                </li>
              ))}
            </ul>
          </section>
          <div className="notice notice-info">
            연소득·보유 자산 원문과 기존 대출 정보는 공유되지 않았습니다.
          </div>
          <Link className="button button-primary button-block" href="/">
            내 조건으로 다시 계산
          </Link>
        </aside>
      </div>
    </CustomerPage>
  );
}
