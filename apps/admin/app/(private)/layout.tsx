import type { ReactNode } from "react";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { TopBar } from "@/components/admin/top-bar";
import { SearchProvider } from "@/context/search-context";
import { requireOperator } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

/**
 * 보호 구역 셸.
 *
 * ⚠️ 이 레이아웃의 `requireOperator()` 는 **두 번째** 관문이다. 첫 관문은 `proxy.ts` 이고
 * 실제 데이터 판정은 각 페이지·서버 액션이 다시 한다. 레이아웃 게이트만 믿지 마라 —
 * 페이지의 데이터 fetch 는 레이아웃보다 먼저 돌 수 있다.
 */
export default async function AdminLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  const principal = await requireOperator();
  return (
    <SearchProvider>
      <div className="flex min-h-screen bg-surface-low">
        <AppSidebar
          name={principal.name}
          email={principal.email}
          role={principal.role}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto p-7">{children}</main>
        </div>
      </div>
    </SearchProvider>
  );
}
