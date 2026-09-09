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
import { listPropertyRows } from "@/lib/admin-data";
import { requireOperator } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/** ADM-R01 — 매물·면적 관리(FR-026). */
export default async function PropertiesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
  }>;
}) {
  await requireOperator();
  const params = await searchParams;
  const rows = await listPropertyRows({
    query: params.q,
    type: params.type,
    status: params.status,
  });

  return (
    <div className="space-y-5">
      <SectionCard>
        <SectionCardHeader
          title="검색·필터"
          description="단지명·지역, 유형, 시세 상태로 좁힙니다."
        />
        <form className="grid gap-4 p-[22px] md:grid-cols-4" method="get">
          <div className="space-y-2">
            <Label htmlFor="q">단지 검색</Label>
            <Input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="단지명 또는 지역"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">유형</Label>
            <select
              id="type"
              name="type"
              defaultValue={params.type ?? ""}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">전체 유형</option>
              <option value="APARTMENT">아파트</option>
              <option value="OFFICETEL">오피스텔</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">시세 상태</Label>
            <select
              id="status"
              name="status"
              defaultValue={params.status ?? ""}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">전체 상태</option>
              <option value="OK">정상</option>
              <option value="CHECK">확인 필요</option>
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
          title="매물·면적"
          description={`총 ${rows.length}건`}
        />
        {rows.length === 0 ? (
          <p className="p-[22px] text-[13.5px] text-n-50">
            조건에 맞는 면적이 없습니다. 검색어를 줄이거나 필터를 해제해 보세요.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <Th>단지</Th>
                <Th>지역·유형</Th>
                <Th>면적</Th>
                <Th>대표 가격</Th>
                <Th>기준일·출처</Th>
                <Th>상태</Th>
                <Th>행동</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.areaId}>
                  <TableCell className="font-semibold">{row.name}</TableCell>
                  <TableCell className="text-n-50">
                    {row.region} · {row.typeLabel}
                  </TableCell>
                  <TableCell>{row.areaText}</TableCell>
                  <TableCell className="font-mono">
                    {row.price.status === "available"
                      ? formatKrwShort(row.price.price)
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-n-50">
                    {row.price.status === "available"
                      ? `${row.price.baseDate} · ${row.price.source === "ADMIN_OVERRIDE" ? "운영자 확정" : `실거래 ${row.price.windowMonths}개월 ${row.price.sampleCount}건`}`
                      : "거래 없음"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.price.status === "available"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {row.price.status === "available" ? "정상" : "확인 필요"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={`/properties/${row.propertyId}/areas/${row.areaId}`}
                      >
                        상세
                      </Link>
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
