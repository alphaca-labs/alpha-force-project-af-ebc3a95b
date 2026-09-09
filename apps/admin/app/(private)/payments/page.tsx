import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { StatusPill } from "@/components/admin/badges";
import { KpiCard } from "@/components/admin/kpi-card";
import {
  SectionCard,
  SectionCardHeader,
} from "@/components/admin/section-card";
import { Th } from "@/components/admin/table";
import { PAY_STATUS_META, payKpis, payments } from "@/lib/mock";

export default function PaymentsPage() {
  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {payKpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} sub={k.sub} />
        ))}
      </div>

      <SectionCard className="overflow-hidden">
        <SectionCardHeader
          title="결제 내역"
          action={
            <span className="font-mono text-[12px] text-n-50">최근 30일</span>
          }
        />
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="bg-surface-low hover:bg-surface-low">
              <Th className="pl-[22px]">거래 ID</Th>
              <Th>회원</Th>
              <Th>상품</Th>
              <Th>상태</Th>
              <Th className="text-right">금액</Th>
              <Th className="pr-[22px] text-right">일시</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => {
              const stm = PAY_STATUS_META[p.status];
              return (
                <TableRow key={p.txid} className="hover:bg-surface-low">
                  <TableCell className="py-[13px] pl-[22px] pr-3 font-mono text-[13px] text-n-30">
                    {p.txid}
                  </TableCell>
                  <TableCell className="p-3 text-[13.5px] font-medium">
                    {p.name}
                  </TableCell>
                  <TableCell className="p-3 text-[13px] text-n-30">
                    {p.product}
                  </TableCell>
                  <TableCell className="p-3">
                    <StatusPill
                      label={stm.label}
                      fg={stm.fg}
                      bg={stm.bg}
                      dot={stm.dot}
                    />
                  </TableCell>
                  <TableCell
                    className="p-3 text-right font-mono text-[13.5px] font-semibold"
                    style={{ color: stm.amtColor }}
                  >
                    {p.amount}
                  </TableCell>
                  <TableCell className="py-[13px] pl-3 pr-[22px] text-right font-mono text-[12.5px] text-n-50">
                    {p.date}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
