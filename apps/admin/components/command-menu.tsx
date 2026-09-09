"use client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/design-system/components/ui/command";
import { MaterialSymbol } from "@repo/design-system/components/ui/material-symbol";
import { useRouter } from "next/navigation";
import React from "react";
import { ADMIN_NAV } from "@/components/admin/nav-config";
import { useSearch } from "@/context/search-context";

export function CommandMenu() {
  const { open, setOpen } = useSearch();
  const router = useRouter();

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false);
      command();
    },
    [setOpen],
  );

  return (
    <CommandDialog modal open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="메뉴 검색 또는 이동…" />
      <CommandList>
        <CommandEmpty>결과가 없습니다.</CommandEmpty>
        <CommandGroup heading="메뉴">
          {ADMIN_NAV.map((item) => (
            <CommandItem
              key={item.key}
              value={item.label}
              onSelect={() => runCommand(() => router.push(item.href))}
            >
              <MaterialSymbol name={item.icon} size={18} />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
