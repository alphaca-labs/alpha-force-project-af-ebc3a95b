import Link from "next/link";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  SectionCard,
  SectionCardHeader,
} from "@/components/admin/section-card";
import { Th } from "@/components/admin/table";
import { listAuditLogs } from "@/lib/admin-data";
import { requireOperator } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/** ADM-R06 — 감사 로그(FR-029). 읽기 전용이며 수정·삭제 수단을 두지 않는다. */
export default async function AuditLogsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    q?: string;
    actor?: string;
    action?: string;
    page?: string;
  }>;
}) {
  await requireOperator();
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const { rows, total, perPage, actors } = await listAuditLogs({
    query: params.q,
    actor: params.actor,
    action: params.action,
    page: Number.isFinite(page) ? page : 1,
  });
  const lastPage = Math.max(Math.ceil(total / perPage), 1);
  const current = Math.min(
    Math.max(Number.isFinite(page) ? page : 1, 1),
    lastPage,
  );

  const linkTo = (next: number) => {
    const q = new URLSearchParams();
    if (params.q) q.set("q", params.q);
    if (params.actor) q.set("actor", params.actor);
    if (params.action) q.set("action", params.action);
    q.set("page", String(next));
    return `/audit-logs?${q.toString()}`;
  };

  return (
    <div className="space-y-5">
      <SectionCard>
        <SectionCardHeader
          title="필터"
          description="행위자·행동·대상으로 좁힙니다."
        />
        <form className="grid gap-4 p-[22px] md:grid-cols-4" method="get">
          <div className="space-y-2">
            <Label htmlFor="q">대상 검색</Label>
            <Input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="대상 ID·유형·행동"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="actor">행위자</Label>
            <select
              id="actor"
              name="actor"
              defaultValue={params.actor ?? ""}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">전체 행위자</option>
              {actors.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="action">행동</Label>
            <Input
              id="action"
              name="action"
              defaultValue={params.action ?? ""}
              placeholder="RULE_VERSION_CREATED"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              필터 적용
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard>
        <SectionCardHeader
          title="변경 기록"
          description={`총 ${total}건 · ${current} / ${lastPage} 쪽`}
        />
        {rows.length === 0 ? (
          <p className="p-[22px] text-[13.5px] text-n-50">
            조건에 맞는 기록이 없습니다.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <Th>행위자</Th>
                <Th>행동</Th>
                <Th>대상</Th>
                <Th>변경 전 → 후</Th>
                <Th>시각</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-[12.5px]">
                    {row.actorEmail}
                  </TableCell>
                  <TableCell className="font-semibold">{row.action}</TableCell>
                  <TableCell className="font-mono text-[12px] text-n-50">
                    {row.targetType}
                    <br />
                    {row.targetId}
                  </TableCell>
                  <TableCell className="max-w-[420px] font-mono text-[11.5px] text-n-50">
                    <div className="truncate">{JSON.stringify(row.before)}</div>
                    <div className="truncate">
                      → {JSON.stringify(row.after)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[12px]">
                    {row.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex items-center justify-between border-t border-border px-[22px] py-3 text-[12.5px]">
          <span className="text-n-50">총 {total}건</span>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm" disabled={current <= 1}>
              <Link href={linkTo(Math.max(current - 1, 1))}>이전</Link>
            </Button>
            <span className="font-mono leading-8">
              {current} / {lastPage}
            </span>
            <Button
              asChild
              variant="ghost"
              size="sm"
              disabled={current >= lastPage}
            >
              <Link href={linkTo(Math.min(current + 1, lastPage))}>다음</Link>
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
