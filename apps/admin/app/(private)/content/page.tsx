"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { MaterialSymbol } from "@repo/design-system/components/ui/material-symbol";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { useState } from "react";
import { StatusPill } from "@/components/admin/badges";
import { SectionCard } from "@/components/admin/section-card";
import { POST_STATUS_META, POST_TABS, posts } from "@/lib/mock";

export default function ContentPage() {
  const [tab, setTab] = useState<string>("전체");
  const rows = posts.filter((p) => {
    if (tab === "게시됨") return p.status === "published";
    if (tab === "임시저장") return p.status === "draft";
    return true;
  });

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto flex-wrap gap-2 bg-transparent p-0">
            {POST_TABS.map((t) => (
              <TabsTrigger
                key={t.label}
                value={t.label}
                className="h-[42px] rounded-full border border-n-80 bg-card px-4 text-[13px] font-medium text-n-30 shadow-none data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:font-semibold data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
              >
                {t.label}
                <span className="ml-[7px] font-mono text-[11px] opacity-70">
                  {t.count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button className="h-[42px] gap-1.5 rounded-full px-[18px] text-[13px] font-semibold shadow-none">
          <MaterialSymbol name="add" size={19} />새 글 작성
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => {
          const stm = POST_STATUS_META[p.status];
          return (
            <SectionCard
              key={p.title}
              className="flex cursor-pointer flex-col overflow-hidden p-0 transition-shadow hover:shadow-e2"
            >
              <div
                className="flex h-[120px] items-center justify-center text-white/85"
                style={{ background: p.cover }}
              >
                <MaterialSymbol name={p.icon} size={36} />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-2.5 flex items-center gap-2">
                  <StatusPill label={stm.label} fg={stm.fg} bg={stm.bg} />
                  <span className="font-mono text-[11.5px] text-n-50">
                    {p.cat}
                  </span>
                </div>
                <div className="mb-auto text-[15px] font-semibold leading-snug tracking-[-0.01em]">
                  {p.title}
                </div>
                <div className="mt-3.5 flex items-center gap-3.5 border-t border-border pt-3 text-[12px] text-n-50">
                  <span className="flex items-center gap-1">
                    <MaterialSymbol name="visibility" size={15} />
                    {p.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <MaterialSymbol name="favorite" size={15} />
                    {p.likes}
                  </span>
                  <span className="ml-auto font-mono">{p.date}</span>
                </div>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
