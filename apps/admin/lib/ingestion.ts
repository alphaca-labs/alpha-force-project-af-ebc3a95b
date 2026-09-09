import "server-only";
import { database } from "@repo/database";

/**
 * FR-025 — 국토교통부 실거래가 증분 수집.
 *
 * 계약:
 *  - 서비스 키는 서버 secret 이며 응답·로그에 싣지 않는다.
 *  - 같은 외부 거래 ID 는 upsert 한다(중복 방지).
 *  - 취소·정정 건은 `cancelled` 로 반영하고 시세 계산에서 빠지게 한다.
 *  - **실패해도 기존 유효 시세를 삭제하거나 0원으로 만들지 않는다.** 실패 구간의 cursor 를
 *    보존해 같은 구간부터 재개한다.
 */
export type IngestionResult = {
  readonly runId: string;
  readonly status: "SUCCEEDED" | "FAILED";
  readonly processed: number;
  readonly created: number;
  readonly corrected: number;
  readonly failed: number;
  readonly message: string | null;
};

type MolitDeal = {
  readonly externalId: string;
  readonly legalCode: string;
  readonly propertyName: string;
  readonly areaM2: number;
  readonly amount: number;
  readonly contractDate: string;
  readonly cancelled: boolean;
};

/** `YYYYMM` 커서. 지정하지 않으면 직전 실행 다음 달부터 이어 간다. */
function nextCursor(previous: string | null): string {
  const now = new Date();
  if (!previous) {
    return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  const year = Number(previous.slice(0, 4));
  const month = Number(previous.slice(4, 6));
  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthRange(cursor: string): { from: Date; to: Date } {
  const year = Number(cursor.slice(0, 4));
  const month = Number(cursor.slice(4, 6));
  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    to: new Date(Date.UTC(year, month, 0)),
  };
}

/**
 * 실거래가 공개시스템 응답을 정규화한다.
 * 응답 스키마가 바뀌어 파싱에 실패하면 그 건만 버리고 나머지는 계속 처리한다.
 */
export function normalizeDeals(
  raw: unknown,
  legalCode: string,
): readonly MolitDeal[] {
  const items = extractItems(raw);
  const deals: MolitDeal[] = [];
  for (const item of items) {
    const row = item as Record<string, unknown>;
    const amount =
      Number(String(row.dealAmount ?? "").replace(/[,\s]/gu, "")) * 10_000;
    const year = Number(row.dealYear);
    const month = Number(row.dealMonth);
    const day = Number(row.dealDay);
    const areaM2 = Number(row.excluUseAr);
    const name = String(row.aptNm ?? row.offiNm ?? "").trim();
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day)
    )
      continue;
    if (!Number.isFinite(areaM2) || areaM2 <= 0 || !name) continue;

    const contractDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    // 국토교통부는 해제 건에 해제 사유 발생일을 채워 보낸다.
    const cancelled =
      String(row.cdealType ?? "").trim() === "O" ||
      Boolean(String(row.cdealDay ?? "").trim());
    deals.push({
      externalId: `MOLIT-${legalCode}-${contractDate}-${name}-${areaM2}-${amount}`,
      legalCode,
      propertyName: name,
      areaM2: Math.round(areaM2 * 100) / 100,
      amount,
      contractDate,
      cancelled,
    });
  }
  return deals;
}

function extractItems(raw: unknown): readonly unknown[] {
  if (!raw || typeof raw !== "object") return [];
  const body = (raw as { response?: { body?: { items?: unknown } } }).response
    ?.body?.items;
  if (!body) return [];
  if (Array.isArray(body)) return body;
  const item = (body as { item?: unknown }).item;
  if (Array.isArray(item)) return item;
  if (item) return [item];
  return [];
}

export async function runIngestion(input: {
  readonly cursor?: string;
  readonly legalCodes?: readonly string[];
  readonly fetchImpl?: typeof fetch;
}): Promise<IngestionResult> {
  const previous = await database.ingestionRun.findFirst({
    where: { status: "SUCCEEDED" },
    orderBy: { startedAt: "desc" },
  });
  const failed = await database.ingestionRun.findFirst({
    where: { status: "FAILED" },
    orderBy: { startedAt: "desc" },
  });
  // 직전 실행이 실패했으면 그 구간부터 다시 시작한다.
  const cursor =
    input.cursor ?? failed?.cursor ?? nextCursor(previous?.cursor ?? null);
  const { from, to } = monthRange(cursor);

  const run = await database.ingestionRun.create({
    data: { cursor, rangeFrom: from, rangeTo: to, status: "RUNNING" },
  });

  const serviceKey = process.env.MOLIT_SERVICE_KEY;
  if (!serviceKey) {
    const message =
      "MOLIT_SERVICE_KEY 가 없어 수집을 실행하지 않았습니다. 기존 시세는 그대로 유지됩니다.";
    await database.ingestionRun.update({
      where: { id: run.id },
      data: { status: "FAILED", message, finishedAt: new Date() },
    });
    return {
      runId: run.id,
      status: "FAILED",
      processed: 0,
      created: 0,
      corrected: 0,
      failed: 0,
      message,
    };
  }

  const codes = input.legalCodes ?? (await activeLegalCodes());
  const doFetch = input.fetchImpl ?? fetch;
  let processed = 0;
  let created = 0;
  let corrected = 0;
  let failedCount = 0;
  let lastError: string | null = null;

  for (const legalCode of codes) {
    try {
      const url = new URL(
        "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev",
      );
      url.searchParams.set("serviceKey", serviceKey);
      url.searchParams.set("LAWD_CD", legalCode);
      url.searchParams.set("DEAL_YMD", cursor);
      url.searchParams.set("numOfRows", "1000");
      url.searchParams.set("_type", "json");
      const response = await doFetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const deals = normalizeDeals(await response.json(), legalCode);

      for (const deal of deals) {
        processed += 1;
        const area = await database.propertyArea.findFirst({
          where: {
            property: { legalCode, name: deal.propertyName },
            areaM2: deal.areaM2,
          },
        });
        // 등록되지 않은 단지·면적은 이번 범위 밖이다. 실패로 세지 않고 건너뛴다.
        if (!area) continue;
        const existing = await database.realEstateTransaction.findUnique({
          where: { externalId: deal.externalId },
        });
        await database.realEstateTransaction.upsert({
          where: { externalId: deal.externalId },
          update: {
            amount: BigInt(deal.amount),
            cancelled: deal.cancelled,
            sourceAt: new Date(),
          },
          create: {
            externalId: deal.externalId,
            areaId: area.id,
            amount: BigInt(deal.amount),
            contractDate: new Date(deal.contractDate),
            cancelled: deal.cancelled,
            sourceAt: new Date(),
          },
        });
        if (!existing) created += 1;
        else if (
          existing.cancelled !== deal.cancelled ||
          existing.amount !== BigInt(deal.amount)
        )
          corrected += 1;
      }
    } catch (error) {
      failedCount += 1;
      lastError = error instanceof Error ? error.message : "수집 실패";
    }
  }

  const status =
    failedCount > 0 && created === 0 && corrected === 0
      ? "FAILED"
      : "SUCCEEDED";
  await database.ingestionRun.update({
    where: { id: run.id },
    data: {
      processedCount: processed,
      createdCount: created,
      correctedCount: corrected,
      failedCount,
      status,
      message: lastError,
      finishedAt: new Date(),
    },
  });

  return {
    runId: run.id,
    status,
    processed,
    created,
    corrected,
    failed: failedCount,
    message: lastError,
  };
}

async function activeLegalCodes(): Promise<readonly string[]> {
  const rows = await database.property.findMany({
    where: { active: true, legalCode: { not: null } },
    distinct: ["legalCode"],
    select: { legalCode: true },
  });
  return rows.map((r) => r.legalCode!).filter(Boolean);
}
