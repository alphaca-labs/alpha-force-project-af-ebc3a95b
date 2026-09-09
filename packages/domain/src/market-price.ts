import type { MarketPrice } from "./types";

/** 대표 시세 산정에 쓰이는 원거래 한 건. */
export type TransactionInput = {
  readonly amount: number;
  /** 계약일(ISO date) */
  readonly contractDate: string;
  readonly cancelled: boolean;
};

/** 유효한 운영자 확정 시세. */
export type PriceOverrideInput = {
  readonly price: number;
  readonly baseDate: string;
  readonly sourceLabel: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
};

/** 정수 중위값. 짝수 개면 두 중앙값의 평균을 내림한다(원 단위 정수 유지). */
export function median(values: readonly number[]): number {
  if (values.length === 0)
    throw new Error("median() 은 빈 배열을 받을 수 없다");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return Math.floor((sorted[mid - 1]! + sorted[mid]!) / 2);
}

function monthsBefore(iso: string, months: number): number {
  const base = new Date(`${iso}T00:00:00Z`);
  base.setUTCMonth(base.getUTCMonth() - months);
  return base.getTime();
}

function isActiveOverride(o: PriceOverrideInput, at: string): boolean {
  const now = new Date(`${at}T00:00:00Z`).getTime();
  if (new Date(`${o.effectiveFrom}T00:00:00Z`).getTime() > now) return false;
  if (o.effectiveTo && new Date(`${o.effectiveTo}T00:00:00Z`).getTime() < now)
    return false;
  return true;
}

/**
 * FR-006 — 평형별 대표 시세.
 *
 * 1. 유효기간 안의 운영자 확정 시세가 있으면 그것을 쓴다(AC3).
 * 2. 없으면 취소되지 않은 거래를 **최근 거래일 기준** 6개월 창으로 모아 중위가격(AC1).
 * 3. 6개월 창이 0건이면 12개월로 넓힌다(AC2). 그래도 0건이면 확인 불가(Edge).
 *
 * 취소·정정된 거래는 입력 단계에서 `cancelled: true` 로 들어와 항상 제외된다.
 */
export function resolveMarketPrice(input: {
  readonly transactions: readonly TransactionInput[];
  readonly override?: PriceOverrideInput | null;
  /** 판정 기준일(ISO date) */
  readonly at: string;
}): MarketPrice {
  const { override, at } = input;
  if (override && isActiveOverride(override, at)) {
    return {
      status: "available",
      price: override.price,
      baseDate: override.baseDate,
      source: "ADMIN_OVERRIDE",
      windowMonths: null,
      sampleCount: 0,
      sourceLabel: override.sourceLabel,
    };
  }

  const live = input.transactions.filter((t) => !t.cancelled);
  if (live.length === 0) {
    return { status: "unavailable", reason: "NO_TRANSACTION_IN_12_MONTHS" };
  }

  // 「최근 거래일 기준」 — 오늘이 아니라 데이터의 마지막 계약일이 창의 끝이다.
  const latest = live.reduce(
    (acc, t) => (t.contractDate > acc ? t.contractDate : acc),
    live[0]!.contractDate,
  );

  for (const windowMonths of [6, 12] as const) {
    const from = monthsBefore(latest, windowMonths);
    const inWindow = live.filter(
      (t) => new Date(`${t.contractDate}T00:00:00Z`).getTime() >= from,
    );
    if (inWindow.length > 0) {
      return {
        status: "available",
        price: median(inWindow.map((t) => t.amount)),
        baseDate: latest,
        source: "TRANSACTION_MEDIAN",
        windowMonths,
        sampleCount: inWindow.length,
        sourceLabel: "국토교통부 실거래가 공개시스템",
      };
    }
  }

  return { status: "unavailable", reason: "NO_TRANSACTION_IN_12_MONTHS" };
}

/** FR-014 Edge — 기준일이 30일 이상 이전이면 오래된 데이터 경고를 켠다. */
export function isStale(baseDate: string, at: string): boolean {
  const days =
    (new Date(`${at}T00:00:00Z`).getTime() -
      new Date(`${baseDate}T00:00:00Z`).getTime()) /
    86_400_000;
  return days >= 30;
}
