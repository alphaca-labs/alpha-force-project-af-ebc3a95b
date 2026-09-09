import "server-only";
import { database } from "@repo/database";
import {
  areaLabel,
  formatKrw,
  resolveMarketPrice,
  type MarketPrice,
} from "@repo/domain";

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function money(value: bigint | number): string {
  return formatKrw(typeof value === "bigint" ? Number(value) : value);
}

export type PropertyRow = {
  readonly propertyId: string;
  readonly areaId: string;
  readonly name: string;
  readonly region: string;
  readonly typeLabel: string;
  readonly areaText: string;
  readonly price: MarketPrice;
};

/** ADM-R01 — 매물·면적 목록. 검색·유형·상태 필터를 서버에서 적용한다. */
export async function listPropertyRows(filter: {
  readonly query?: string;
  readonly type?: string;
  readonly status?: string;
}): Promise<readonly PropertyRow[]> {
  const areas = await database.propertyArea.findMany({
    where: {
      active: true,
      property: {
        active: true,
        ...(filter.type === "APARTMENT" || filter.type === "OFFICETEL"
          ? { type: filter.type }
          : {}),
        ...(filter.query
          ? {
              OR: [
                {
                  name: {
                    contains: filter.query,
                    mode: "insensitive" as const,
                  },
                },
                {
                  region: {
                    contains: filter.query,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : {}),
      },
    },
    orderBy: [{ property: { name: "asc" } }, { areaM2: "asc" }],
    take: 200,
    include: {
      property: true,
      transactions: {
        where: { cancelled: false },
        orderBy: { contractDate: "desc" },
        take: 200,
      },
      overrides: {
        where: { status: "ACTIVE" },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
    },
  });
  const at = toIsoDate(new Date());

  const rows = areas.map((area): PropertyRow => {
    const override = area.overrides[0];
    return {
      propertyId: area.propertyId,
      areaId: area.id,
      name: area.property.name,
      region: area.property.region,
      typeLabel: area.property.type === "APARTMENT" ? "아파트" : "오피스텔",
      areaText: areaLabel(Number(area.areaM2)),
      price: resolveMarketPrice({
        at,
        transactions: area.transactions.map((t) => ({
          amount: Number(t.amount),
          contractDate: toIsoDate(t.contractDate),
          cancelled: t.cancelled,
        })),
        override: override
          ? {
              price: Number(override.price),
              baseDate: toIsoDate(override.baseDate),
              sourceLabel: override.sourceLabel,
              effectiveFrom: toIsoDate(override.effectiveFrom),
              effectiveTo: override.effectiveTo
                ? toIsoDate(override.effectiveTo)
                : null,
            }
          : null,
      }),
    };
  });

  if (filter.status === "OK")
    return rows.filter((r) => r.price.status === "available");
  if (filter.status === "CHECK")
    return rows.filter((r) => r.price.status !== "available");
  return rows;
}

/** ADM-R02 — 면적 상세와 변경 이력. */
export async function getAreaAdminDetail(areaId: string) {
  const area = await database.propertyArea.findUnique({
    where: { id: areaId },
    include: {
      property: true,
      transactions: {
        where: { cancelled: false },
        orderBy: { contractDate: "desc" },
        take: 200,
      },
      overrides: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { createdBy: true },
      },
    },
  });
  if (!area) return null;
  const at = toIsoDate(new Date());
  const activeOverride = area.overrides.find(
    (o) =>
      o.status === "ACTIVE" &&
      toIsoDate(o.effectiveFrom) <= at &&
      (!o.effectiveTo || toIsoDate(o.effectiveTo) >= at),
  );
  const price = resolveMarketPrice({
    at,
    transactions: area.transactions.map((t) => ({
      amount: Number(t.amount),
      contractDate: toIsoDate(t.contractDate),
      cancelled: t.cancelled,
    })),
    override: activeOverride
      ? {
          price: Number(activeOverride.price),
          baseDate: toIsoDate(activeOverride.baseDate),
          sourceLabel: activeOverride.sourceLabel,
          effectiveFrom: toIsoDate(activeOverride.effectiveFrom),
          effectiveTo: activeOverride.effectiveTo
            ? toIsoDate(activeOverride.effectiveTo)
            : null,
        }
      : null,
  });

  const auto = resolveMarketPrice({
    at,
    transactions: area.transactions.map((t) => ({
      amount: Number(t.amount),
      contractDate: toIsoDate(t.contractDate),
      cancelled: t.cancelled,
    })),
  });

  return { area, price, auto, overrides: area.overrides };
}

/** ADM-R03 — 규칙 목록. */
export async function listRuleRows(filter: {
  readonly query?: string;
  readonly kind?: string;
  readonly status?: string;
}) {
  const rows = await database.loanRuleVersion.findMany({
    where: {
      ...(filter.status === "ACTIVE" ||
      filter.status === "SCHEDULED" ||
      filter.status === "EXPIRED" ||
      filter.status === "INACTIVE"
        ? { status: filter.status }
        : {}),
      product: {
        ...(filter.kind === "GENERAL" || filter.kind === "GOVERNMENT"
          ? { kind: filter.kind }
          : {}),
        ...(filter.query
          ? { name: { contains: filter.query, mode: "insensitive" as const } }
          : {}),
      },
    },
    orderBy: [{ product: { name: "asc" } }, { version: "desc" }],
    take: 200,
    include: { product: true },
  });
  return rows;
}

export async function getRuleDetail(ruleId: string) {
  const version = await database.loanRuleVersion.findUnique({
    where: { id: ruleId },
    include: {
      product: { include: { versions: { orderBy: { version: "desc" } } } },
    },
  });
  return version;
}

/** ADM-R05 — 관리자 계정과 초대. */
export async function listAdmins() {
  const [accounts, invitations] = await Promise.all([
    database.adminAccount.findMany({ orderBy: { createdAt: "asc" } }),
    database.adminInvitation.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { accounts, invitations };
}

/** ADM-R06 — 감사 로그. 읽기 전용이다. */
export async function listAuditLogs(filter: {
  readonly query?: string;
  readonly actor?: string;
  readonly action?: string;
  readonly page?: number;
}) {
  const page = Math.max(filter.page ?? 1, 1);
  const perPage = 25;
  const where = {
    ...(filter.actor ? { actorEmail: filter.actor } : {}),
    ...(filter.action ? { action: filter.action } : {}),
    ...(filter.query
      ? {
          OR: [
            { targetId: { contains: filter.query } },
            {
              targetType: {
                contains: filter.query,
                mode: "insensitive" as const,
              },
            },
            {
              action: { contains: filter.query, mode: "insensitive" as const },
            },
          ],
        }
      : {}),
  };
  const [rows, total, actors] = await Promise.all([
    database.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    database.auditLog.count({ where }),
    database.auditLog.findMany({
      distinct: ["actorEmail"],
      select: { actorEmail: true },
      take: 50,
    }),
  ]);
  return {
    rows,
    total,
    page,
    perPage,
    actors: actors.map((a) => a.actorEmail),
  };
}

/** ADM-P06 — 초대 조회와 사용 가능 여부 판정. 시각 비교를 렌더 밖에서 끝낸다. */
export async function getUsableInvitation(tokenHash: string) {
  const invitation = await database.adminInvitation.findUnique({
    where: { tokenHash },
  });
  if (!invitation) return null;
  if (invitation.status !== "PENDING") return null;
  if (invitation.expiresAt.getTime() < Date.now()) return null;
  return invitation;
}
