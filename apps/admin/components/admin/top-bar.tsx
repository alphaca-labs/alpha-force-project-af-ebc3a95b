"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Kbd } from "@repo/design-system/components/ui/kbd";
import { MaterialSymbol } from "@repo/design-system/components/ui/material-symbol";
import { usePathname } from "next/navigation";
import { useSearch } from "@/context/search-context";
import { pageMeta } from "./nav-config";

export function TopBar() {
  const pathname = usePathname();
  const { setOpen } = useSearch();
  const { title, crumb } = pageMeta(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b border-n-90 bg-surface/90 px-7 backdrop-blur-sm">
      <div className="min-w-0">
        <div className="truncate text-[17px] font-semibold leading-tight tracking-[-0.01em]">
          {title}
        </div>
        {crumb ? (
          <div className="mt-0.5 truncate text-[12px] leading-tight text-n-50">
            {crumb}
          </div>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="h-10 w-[260px] justify-start gap-2 rounded-full px-3.5 font-normal text-n-50 shadow-none"
        >
          <MaterialSymbol name="search" size={19} className="text-n-50" />
          <span className="flex-1 text-left text-[13.5px]">검색…</span>
          <Kbd className="rounded-[5px] border border-n-90 bg-card px-[5px] font-mono text-[10.5px] text-n-50">
            ⌘K
          </Kbd>
        </Button>
        <Button
          variant="outline"
          size="icon"
          title="알림"
          className="relative size-10 rounded-full text-n-30 shadow-none"
        >
          <MaterialSymbol name="notifications" size={21} />
          <span className="absolute right-2.5 top-[9px] size-[7px] rounded-full border-[1.5px] border-card bg-destructive" />
        </Button>
      </div>
    </header>
  );
}
