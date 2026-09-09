import { MaterialSymbol } from "@repo/design-system/components/ui/material-symbol";
import Link from "next/link";
import { AvatarMono } from "@/components/admin/avatar-mono";
import { StatusPill } from "@/components/admin/badges";
import { KpiCard } from "@/components/admin/kpi-card";
import {
  SectionCard,
  SectionCardHeader,
} from "@/components/admin/section-card";
import { kpis, recentMembers, signupTrend, STATUS_META, tiers } from "@/lib/mock";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1180px]">
      {/* KPIs */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* Trend + tiers */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <SectionCard className="px-[22px] py-5">
          <div className="mb-1.5 flex items-center justify-between">
            <div>
              <div className="text-[15px] font-semibold">가입 추이</div>
              <div className="mt-0.5 text-[12.5px] text-n-50">
                최근 12주 신규 가입 수
              </div>
            </div>
            <div className="flex gap-1.5">
              <span className="rounded-full bg-primary px-3 py-[5px] text-[12px] font-semibold text-primary-foreground">
                주간
              </span>
              <span className="rounded-full border border-n-90 px-3 py-[5px] text-[12px] text-n-30">
                월간
              </span>
            </div>
          </div>
          <svg
            viewBox="0 0 620 240"
            preserveAspectRatio="none"
            className="mt-2 block h-auto w-full"
            role="img"
            aria-label="가입 추이 차트"
          >
            <defs>
              <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#1a1a1a" stopOpacity="0.14" />
                <stop offset="1" stopColor="#1a1a1a" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" y1="60" x2="620" y2="60" stroke="#e3e3e3" />
            <line x1="0" y1="120" x2="620" y2="120" stroke="#e3e3e3" />
            <line x1="0" y1="180" x2="620" y2="180" stroke="#e3e3e3" />
            <path d={signupTrend.area} fill="url(#signupGradient)" />
            <path
              d={signupTrend.line}
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={signupTrend.peak.cx} cy={signupTrend.peak.cy} r="4.5" fill="#1a1a1a" />
            <circle
              cx={signupTrend.peak.cx}
              cy={signupTrend.peak.cy}
              r="8"
              fill="#1a1a1a"
              fillOpacity="0.15"
            />
          </svg>
          <div className="mt-2 flex justify-between font-mono text-[10.5px] text-n-40">
            {signupTrend.labels.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="px-[22px] py-5">
          <div className="text-[15px] font-semibold">등급 분포</div>
          <div className="mb-[18px] mt-0.5 text-[12.5px] text-n-50">
            전체 회원 등급별 비율
          </div>
          {tiers.map((t) => (
            <div key={t.label} className="mb-[15px]">
              <div className="mb-1.5 flex justify-between text-[13px]">
                <span className="font-medium">{t.label}</span>
                <span className="font-mono text-n-30">
                  {t.count} · {t.pct}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-high">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${t.pct}%`, background: t.color }}
                />
              </div>
            </div>
          ))}
        </SectionCard>
      </div>

      {/* Recent members */}
      <SectionCard className="overflow-hidden">
        <SectionCardHeader
          title="최근 가입 회원"
          action={
            <Link
              href="/members"
              className="flex items-center gap-0.5 text-[13px] font-semibold text-foreground"
            >
              전체 보기
              <MaterialSymbol name="chevron_right" size={18} />
            </Link>
          }
        />
        {recentMembers.map((m) => {
          const st = STATUS_META[m.status];
          return (
            <Link
              key={m.id}
              href={`/members/${m.id}`}
              className="flex items-center gap-3.5 border-b border-border px-[22px] py-3.5 last:border-b-0 hover:bg-surface-low"
            >
              <AvatarMono initial={m.initial} tone={m.avatar} size={36} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium">{m.name}</div>
                <div className="text-[12.5px] text-n-50">{m.email}</div>
              </div>
              <span className="font-mono text-[12px] text-n-30">{m.joined}</span>
              <StatusPill label={st.label} fg={st.fg} bg={st.bg} dot={st.dot} />
            </Link>
          );
        })}
      </SectionCard>
    </div>
  );
}
