import { Button } from "@repo/design-system/components/ui/button";
import { MaterialSymbol } from "@repo/design-system/components/ui/material-symbol";
import Link from "next/link";
import { AvatarMono } from "@/components/admin/avatar-mono";
import { StatusPill, TierBadge } from "@/components/admin/badges";
import { SectionCard } from "@/components/admin/section-card";
import { getMember, memberDetail, STATUS_META } from "@/lib/mock";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m = getMember(Number(id));
  const d = memberDetail(m);
  const st = STATUS_META[m.status];

  return (
    <div className="mx-auto max-w-[1080px]">
      <Link
        href="/members"
        className="mb-[18px] inline-flex items-center gap-1 rounded-full py-1.5 pl-1.5 pr-2.5 text-[13px] font-semibold text-n-30 hover:bg-secondary"
      >
        <MaterialSymbol name="arrow_back" size={20} />
        회원 관리로
      </Link>

      {/* Header card */}
      <SectionCard className="mb-4 flex flex-wrap items-center gap-5 p-[26px]">
        <AvatarMono initial={m.initial} tone={m.avatar} size={72} />
        <div className="min-w-[180px] flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-[23px] font-semibold tracking-[-0.02em]">
              {m.name}
            </h2>
            <StatusPill label={st.label} fg={st.fg} bg={st.bg} dot={st.dot} />
            <TierBadge tier={m.tier} />
          </div>
          <div className="mt-1.5 font-mono text-[13.5px] text-n-50">
            {m.email} · ID #{m.id}
          </div>
        </div>
        <div className="flex gap-2.5">
          <Button
            variant="outline"
            className="h-[42px] gap-1.5 rounded-full px-4 text-[13px] font-semibold shadow-none"
          >
            <MaterialSymbol name="edit" size={18} />
            수정
          </Button>
          <Button
            variant="outline"
            className="h-[42px] gap-1.5 rounded-full border-err-container px-4 text-[13px] font-semibold text-destructive shadow-none hover:bg-err-container hover:text-destructive"
          >
            <MaterialSymbol name="block" size={18} />
            정지
          </Button>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <SectionCard className="overflow-hidden">
            <div className="border-b border-border px-[22px] py-4 text-[14px] font-semibold">
              기본 정보
            </div>
            {d.info.map((row) => (
              <div
                key={row.k}
                className="flex border-b border-border px-[22px] py-[13px] last:border-b-0"
              >
                <span className="w-[140px] shrink-0 text-[13px] text-n-50">
                  {row.k}
                </span>
                <span className="text-[13.5px] font-medium text-foreground">
                  {row.v}
                </span>
              </div>
            ))}
          </SectionCard>

          <SectionCard className="overflow-hidden">
            <div className="border-b border-border px-[22px] py-4 text-[14px] font-semibold">
              최근 활동
            </div>
            {d.activity.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3.5 border-b border-border px-[22px] py-[13px] last:border-b-0"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-secondary text-foreground">
                  <MaterialSymbol name={a.icon} size={17} />
                </span>
                <div className="flex-1">
                  <div className="text-[13.5px] text-foreground">{a.text}</div>
                  <div className="mt-0.5 font-mono text-[12px] text-n-50">
                    {a.time}
                  </div>
                </div>
              </div>
            ))}
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <SectionCard className="px-[22px] py-5">
            <div className="mb-4 text-[14px] font-semibold">요약</div>
            {d.stats.map((s) => (
              <div
                key={s.k}
                className="flex items-center justify-between border-b border-border py-[9px] last:border-b-0"
              >
                <span className="text-[13px] text-n-30">{s.k}</span>
                <span className="text-[16px] font-bold tracking-[-0.01em]">
                  {s.v}
                </span>
              </div>
            ))}
          </SectionCard>

          <div className="rounded-[12px] bg-foreground px-[22px] py-5 text-n-95">
            <div className="mb-1.5 text-[13px] text-n-80">누적 결제 금액</div>
            <div className="text-[30px] font-bold tracking-[-0.02em]">
              {d.totalPaid}
            </div>
            <div className="mt-1.5 text-[12.5px] text-n-60">
              최근 결제 {d.lastPaid}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
