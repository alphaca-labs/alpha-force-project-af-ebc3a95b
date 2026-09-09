"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { MaterialSymbol } from "@repo/design-system/components/ui/material-symbol";
import { cn } from "@repo/design-system/lib/utils";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV, isNavActive } from "./nav-config";

export function AppSidebar() {
  const pathname = usePathname();
  const { data } = useSession();
  const name = data?.user?.name?.trim() || "관리자";
  const email = data?.user?.email || "admin@omniseed.io";

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col border-r border-n-90 bg-card">
      {/* Brand */}
      <div className="flex h-16 items-center gap-[11px] border-b border-n-90 px-[22px]">
        <span className="flex size-[30px] items-center justify-center rounded-lg bg-foreground text-[16px] font-extrabold text-background">
          O
        </span>
        <span className="text-[17px] font-bold tracking-[-0.02em]">omniseed</span>
        <span className="ml-auto rounded-[5px] border border-n-90 px-[5px] py-0.5 font-mono text-[10px] text-n-50">
          admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-auto p-3">
        <div className="px-3 pb-1.5 pt-2.5 text-[11px] font-semibold tracking-[0.04em] text-n-50">
          메뉴
        </div>
        {ADMIN_NAV.map((item) => {
          const active = isNavActive(item.href, pathname);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-3 py-[11px] text-[14px]",
                active
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "font-medium text-n-30 hover:bg-secondary",
              )}
            >
              <MaterialSymbol name={item.icon} filled={active} size={21} />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold",
                    active
                      ? "bg-white/15 text-primary-foreground"
                      : "bg-secondary text-n-50",
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-n-90 p-3">
        <div className="flex items-center gap-[11px] rounded-[10px] px-2.5 py-2">
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-foreground text-[13px] font-semibold text-background">
            {name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold leading-tight">{name}</div>
            <div className="truncate text-[11.5px] leading-tight text-n-50">
              {email}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            title="로그아웃"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="size-8 text-n-50 hover:text-foreground"
          >
            <MaterialSymbol name="logout" size={20} />
          </Button>
        </div>
      </div>
    </aside>
  );
}
