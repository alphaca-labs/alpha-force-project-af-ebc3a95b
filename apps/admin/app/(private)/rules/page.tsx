import Link from "next/link";
import { Badge } from "@repo/design-system/components/ui/badge";
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
import { formatKrwShort } from "@repo/domain";
import {
  SectionCard,
  SectionCardHeader,
} from "@/components/admin/section-card";
import { Th } from "@/components/admin/table";
import { listRuleRows, toIsoDate } from "@/lib/admin-data";
import { requireOperator } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/** ADM-R03 — 계산 규칙 관리(FR-028). 수정은 상세에서만 한다. */
export default async function RulesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    q?: string;
    kind?: string;
    status?: string;
  }>;
}) {
  await requireOperator();
  const params = await searchParams;
  const rows = await listRuleRows({
    query: params.q,
    kind: params.kind,
    status: params.status,
  });

  return (
    <div className="space-y-5">
      <SectionCard>
        <SectionCardHeader
          title="검색·필터"
          description="규칙명, 종류, 상태로 좁힙니다."
        />
        <form className="grid gap-4 p-[22px] md:grid-cols-4" method="get">
          <div className="space-y-2">
            <Label htmlFor="q">규칙 검색</Label>
            <Input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="상품명"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kind">종류</Label>
            <select
              id="kind"
              name="kind"
              defaultValue={params.kind ?? ""}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">전체 종류</option>
              <option value="GENERAL">일반 대출</option>
              <option value="GOVERNMENT">정부 지원</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">상태</Label>
            <select
              id="status"
              name="status"
              defaultValue={params.status ?? ""}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">전체 상태</option>
              <option value="ACTIVE">활성</option>
              <option value="SCHEDULED">예정</option>
              <option value="EXPIRED">종료</option>
              <option value="INACTIVE">비활성</option>
            </select>
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
          title="대출 규칙 버전"
          description={`총 ${rows.length}건`}
        />
        {rows.length === 0 ? (
          <p className="p-[22px] text-[13.5px] text-n-50">
            조건에 맞는 규칙 버전이 없습니다.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <Th>상품</Th>
                <Th>종류</Th>
                <Th>버전</Th>
                <Th>LTV · DSR</Th>
                <Th>한도</Th>
                <Th>유효기간</Th>
                <Th>상태</Th>
                <Th>행동</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-semibold">
                    {row.product.name}
                  </TableCell>
                  <TableCell className="text-n-50">
                    {row.product.kind === "GENERAL" ? "일반 대출" : "정부 지원"}
                  </TableCell>
                  <TableCell className="font-mono">v{row.version}</TableCell>
                  <TableCell className="font-mono">
                    {(Number(row.ltv) * 100).toFixed(0)}% ·{" "}
                    {(Number(row.dsr) * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatKrwShort(Number(row.maxAmount))}
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-n-50">
                    {toIsoDate(row.effectiveFrom)} ~{" "}
                    {row.effectiveTo ? toIsoDate(row.effectiveTo) : "무기한"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "ACTIVE" ? "secondary" : "outline"
                      }
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/rules/${row.id}`}>상세</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}
