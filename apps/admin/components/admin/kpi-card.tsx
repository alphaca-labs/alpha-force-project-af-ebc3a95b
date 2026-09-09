import { MaterialSymbol } from "@repo/design-system/components/ui/material-symbol";
import { SectionCard } from "./section-card";

/** 대시보드/결제 공유 KPI 카드. delta 상승=foreground, 하락=destructive. */
export function KpiCard({
  label,
  value,
  icon,
  delta,
  deltaIcon,
  positive = true,
  sub,
}: {
  label: string;
  value: string;
  icon?: string;
  delta?: string;
  deltaIcon?: string;
  positive?: boolean;
  sub?: string;
}) {
  const deltaColor = positive ? "text-foreground" : "text-destructive";
  return (
    <SectionCard className="px-[18px] pb-4 pt-[18px]">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-n-30">{label}</span>
        {icon ? (
          <span className="flex size-8 items-center justify-center rounded-[9px] bg-secondary text-foreground">
            <MaterialSymbol name={icon} size={18} />
          </span>
        ) : null}
      </div>
      <div className="text-[28px] font-bold leading-none tracking-[-0.02em]">
        {value}
      </div>
      {delta || sub ? (
        <div className="mt-2.5 flex items-center gap-1.5">
          {deltaIcon ? (
            <MaterialSymbol
              name={deltaIcon}
              size={16}
              className={deltaColor}
            />
          ) : null}
          {delta ? (
            <span className={`text-[12.5px] font-semibold ${deltaColor}`}>
              {delta}
            </span>
          ) : null}
          {sub ? <span className="text-[12px] text-n-40">{sub}</span> : null}
        </div>
      ) : null}
    </SectionCard>
  );
}
