import type { Timeline } from "./types";

/** 원 단위 정수를 「3억 2,000만원」꼴로 줄인다. 단위 의미와 통화는 보존한다(FR-021 Edge). */
export function formatKrwShort(won: number): string {
  if (!Number.isFinite(won)) return "계산 불가";
  const sign = won < 0 ? "-" : "";
  const abs = Math.abs(Math.round(won));
  if (abs === 0) return "0원";
  const jo = Math.floor(abs / 1_0000_0000_0000);
  const eok = Math.floor((abs % 1_0000_0000_0000) / 1_0000_0000);
  const man = Math.floor((abs % 1_0000_0000) / 1_0000);
  const rest = abs % 1_0000;
  const parts: string[] = [];
  if (jo > 0) parts.push(`${jo.toLocaleString("ko-KR")}조`);
  if (eok > 0) parts.push(`${eok.toLocaleString("ko-KR")}억`);
  if (man > 0) parts.push(`${man.toLocaleString("ko-KR")}만`);
  if (rest > 0 && jo === 0 && eok === 0)
    parts.push(`${rest.toLocaleString("ko-KR")}`);
  return `${sign}${parts.join(" ")}원`;
}

/** 원 단위 정수를 「320,000,000원」꼴로 그대로 쓴다. 상세·표에서 사용한다. */
export function formatKrw(won: number): string {
  if (!Number.isFinite(won)) return "계산 불가";
  return `${Math.round(won).toLocaleString("ko-KR")}원`;
}

/** FR-009 — 예상 기간 표시. 1,200개월 이상은 「100년 이상」. */
export function formatMonths(timeline: Timeline): string {
  if (timeline.status === "IMMEDIATE") return "즉시 가능";
  if (timeline.status === "UNCOMPUTABLE") return "계산 불가";
  if (timeline.overCentury) return "100년 이상";
  if (timeline.years === 0) return `${timeline.restMonths}개월`;
  if (timeline.restMonths === 0) return `${timeline.years}년`;
  return `${timeline.years}년 ${timeline.restMonths}개월`;
}

/** 뜻을 보존하며 줄인다(FR-011 Edge). 원본 전체는 title 속성 등으로 별도 노출한다. */
export function truncateName(name: string, max = 18): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

/** 전용면적 ㎡ → 평 환산(1평 = 3.3058㎡). 표시는 정수 평. */
export function toPyeong(areaM2: number): number {
  return Math.round(areaM2 / 3.3058);
}

export function areaLabel(areaM2: number): string {
  return `전용 ${areaM2}㎡ (${toPyeong(areaM2)}평)`;
}
