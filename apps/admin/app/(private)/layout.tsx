import type { ReactNode } from "react";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { TopBar } from "@/components/admin/top-bar";
import { SearchProvider } from "@/context/search-context";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SearchProvider>
      <div className="flex min-h-screen bg-surface-low">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto p-7">{children}</main>
        </div>
      </div>
    </SearchProvider>
  );
}
