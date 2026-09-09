"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { MaterialSymbol } from "@repo/design-system/components/ui/material-symbol";
import { Switch } from "@repo/design-system/components/ui/switch";
import { useState } from "react";
import { SectionCard } from "@/components/admin/section-card";
import { settingsLinks, settingsToggles } from "@/lib/mock";

export default function SettingsPage() {
  const [switches, setSwitches] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(settingsToggles.map((t) => [t.key, t.defaultOn])),
  );

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-4">
      {/* General */}
      <SectionCard className="overflow-hidden">
        <div className="border-b border-border px-[22px] py-4 text-[14px] font-semibold">
          일반
        </div>
        {settingsToggles.map((t) => (
          <div
            key={t.key}
            className="flex items-center gap-3.5 border-b border-border px-[22px] py-[15px] last:border-b-0"
          >
            <IconChip name={t.icon} />
            <div className="flex-1">
              <div className="text-[14px] font-medium">{t.label}</div>
              <div className="mt-px text-[12.5px] text-n-50">{t.desc}</div>
            </div>
            <Switch
              checked={switches[t.key]}
              onCheckedChange={(v) =>
                setSwitches((s) => ({ ...s, [t.key]: v }))
              }
            />
          </div>
        ))}
      </SectionCard>

      {/* Organization */}
      <SectionCard className="overflow-hidden">
        <div className="border-b border-border px-[22px] py-4 text-[14px] font-semibold">
          조직
        </div>
        {settingsLinks.map((s) => (
          <button
            key={s.label}
            type="button"
            className="flex w-full items-center gap-3.5 border-b border-border px-[22px] py-[15px] text-left last:border-b-0 hover:bg-surface-low"
          >
            <IconChip name={s.icon} />
            <div className="flex-1">
              <div className="text-[14px] font-medium">{s.label}</div>
              <div className="mt-px text-[12.5px] text-n-50">{s.desc}</div>
            </div>
            <MaterialSymbol name="chevron_right" size={20} className="text-n-50" />
          </button>
        ))}
      </SectionCard>

      {/* Danger zone */}
      <div className="flex items-center gap-3.5 rounded-[12px] border border-err-container bg-card px-[22px] py-[18px] shadow-e1">
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-destructive">
            계정 삭제
          </div>
          <div className="mt-0.5 text-[12.5px] text-n-50">
            삭제 후에는 데이터를 되돌릴 수 없어요.
          </div>
        </div>
        <Button
          variant="outline"
          className="h-10 rounded-full border-err-container px-4 text-[13px] font-semibold text-destructive shadow-none hover:bg-err-container hover:text-destructive"
        >
          삭제
        </Button>
      </div>
    </div>
  );
}

function IconChip({ name }: { name: string }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-secondary text-foreground">
      <MaterialSymbol name={name} size={19} />
    </span>
  );
}
