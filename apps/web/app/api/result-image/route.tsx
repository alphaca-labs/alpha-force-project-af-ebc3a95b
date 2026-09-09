import { ImageResponse } from "next/og";
import { formatKrwShort, formatMonths } from "@repo/domain";
import { readSession } from "@/lib/session";
import { buildSimulation } from "@/lib/simulation";

export const dynamic = "force-dynamic";

/**
 * FR-021 — 결과 이미지 1080×1350 PNG.
 *
 * 입력은 현재 계산 스냅숏뿐이다. 외부 조회용 식별 정보·인증 정보·금융기관 식별값은 넣지 않는다.
 * 긴 매물명은 뜻을 보존해 줄이고, 금액은 단위를 줄여도 통화 의미를 유지한다.
 */
export async function GET() {
  const session = await readSession();
  const built = await buildSimulation(session);
  if (!built.ok) {
    return new Response("결과가 없습니다.", { status: 404 });
  }
  const { detail, result, roadmap } = built.bundle;
  const target = `${detail.property.name} ${detail.area.label}`;
  const recommended = roadmap.scenarios.find((s) => s.recommended);

  const CREAM = "#f7f4ec";
  const INK = "#1f2328";
  const PEAR = "#e7d43a";

  return new ImageResponse(
    <div
      style={{
        width: 1080,
        height: 1350,
        display: "flex",
        flexDirection: "column",
        background: CREAM,
        color: INK,
        padding: 64,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 30,
          opacity: 0.7,
        }}
      >
        <span>뭐해야집사냐?</span>
        <span>{result.priceBaseDate} 기준</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 48 }}>
        <span style={{ fontSize: 40, opacity: 0.75 }}>{target}</span>
        <span style={{ fontSize: 34, opacity: 0.6, marginTop: 12 }}>
          목표까지 부족한 돈
        </span>
        <span
          style={{
            fontSize: 118,
            fontWeight: 900,
            marginTop: 8,
            letterSpacing: -4,
          }}
        >
          {formatKrwShort(result.shortfall)}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 40,
          padding: "28px 32px",
          background: PEAR,
          border: `4px solid ${INK}`,
          borderRadius: 24,
          justifyContent: "space-between",
          fontSize: 34,
          fontWeight: 700,
        }}
      >
        <span>예상 기간 {formatMonths(result.timeline)}</span>
        <span>달성률 {result.achievementRate}%</span>
      </div>

      <div style={{ display: "flex", marginTop: 40, gap: 24 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            border: `3px solid ${INK}`,
            borderRadius: 20,
            padding: 28,
            fontSize: 30,
          }}
        >
          <span style={{ opacity: 0.6 }}>보유 자산 스펙</span>
          <span style={{ fontSize: 44, fontWeight: 800, marginTop: 8 }}>
            {formatKrwShort(result.assets)}
          </span>
          <span style={{ opacity: 0.6, marginTop: 20 }}>가능 대출</span>
          <span style={{ fontSize: 44, fontWeight: 800, marginTop: 8 }}>
            {formatKrwShort(result.loanCapacity)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            border: `3px solid ${INK}`,
            borderRadius: 20,
            padding: 28,
            fontSize: 30,
          }}
        >
          <span style={{ opacity: 0.6 }}>절망 지수</span>
          <span style={{ fontSize: 44, fontWeight: 800, marginTop: 8 }}>
            {result.despairIndex} / 100
          </span>
          <span style={{ opacity: 0.6, marginTop: 20 }}>생존 연한</span>
          <div
            style={{
              display: "flex",
              marginTop: 12,
              height: 26,
              background: "#e2ddd0",
              borderRadius: 999,
            }}
          >
            <div
              style={{
                display: "flex",
                width: `${Math.min(result.despairIndex, 100)}%`,
                background: INK,
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 40,
          fontSize: 32,
        }}
      >
        <span style={{ opacity: 0.6 }}>캐릭터 상태 · 장착 장비</span>
        <span style={{ fontSize: 42, fontWeight: 800, marginTop: 10 }}>
          {result.characterLabel}
        </span>
        <span style={{ marginTop: 10, opacity: 0.85 }}>
          {result.equipment.join(" · ")}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 32,
          padding: "24px 28px",
          border: `3px solid ${INK}`,
          borderRadius: 20,
          fontSize: 30,
        }}
      >
        {result.raidMessage}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: "auto",
          fontSize: 26,
          opacity: 0.7,
        }}
      >
        <span>
          추천 조달: {recommended?.productNames.join(" + ") || "저축만"}
        </span>
        <span style={{ marginTop: 8 }}>
          정보 제공 목적이며 대출 승인·매입 가능을 보장하지 않습니다.
        </span>
      </div>
    </div>,
    { width: 1080, height: 1350 },
  );
}
