"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { MaterialSymbol } from "@repo/design-system/components/ui/material-symbol";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@repo/design-system/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@repo/design-system/components/ui/tabs";
import { cn } from "@repo/design-system/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AvatarMono } from "@/components/admin/avatar-mono";
import { StatusPill, TierBadge } from "@/components/admin/badges";
import {
  SectionCard,
  SectionCardHeader,
} from "@/components/admin/section-card";
import { Th } from "@/components/admin/table";
import {
  filterMembers,
  MEMBER_FILTERS,
  type MemberFilter,
  members,
  STATUS_META,
} from "@/lib/mock";

export default function MembersPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<MemberFilter>("전체");
  const rows = filterMembers(members, filter);

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Controls */}
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex h-[42px] w-[300px] items-center gap-2 rounded-full border border-n-80 bg-card px-4">
            <MaterialSymbol name="search" size={20} className="text-n-50" />
            <Input
              placeholder="이름 또는 이메일 검색"
              className="h-auto border-0 bg-transparent p-0 text-[14px] shadow-none focus-visible:ring-0"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as MemberFilter)}>
            <TabsList className="h-auto gap-2.5 bg-transparent p-0">
              {MEMBER_FILTERS.map((f) => (
                <TabsTrigger
                  key={f}
                  value={f}
                  className="h-[42px] rounded-full border border-n-80 bg-card px-[15px] text-[13px] font-medium text-n-30 shadow-none data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:font-semibold data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
                >
                  {f}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="flex gap-2.5">
          <Button
            variant="outline"
            className="h-[42px] gap-1.5 rounded-full px-4 text-[13px] font-semibold shadow-none"
          >
            <MaterialSymbol name="download" size={19} />
            내보내기
          </Button>
          <Button className="h-[42px] gap-1.5 rounded-full px-[18px] text-[13px] font-semibold shadow-none">
            <MaterialSymbol name="add" size={19} />
            회원 추가
          </Button>
        </div>
      </div>

      {/* Table */}
      <SectionCard className="overflow-hidden">
        <SectionCardHeader
          title={
            <span className="text-[13px] font-normal text-n-30">
              <b className="font-semibold text-foreground">12,847</b>명 중 1–
              {rows.length} 표시
            </span>
          }
          action={
            <span className="font-mono text-[12px] text-n-50">정렬: 가입일 ↓</span>
          }
        />
        <Table className="min-w-[880px]">
          <TableHeader>
            <TableRow className="bg-surface-low hover:bg-surface-low">
              <Th className="w-[42px] pl-[22px]">
                <Checkbox aria-label="전체 선택" className="size-[18px]" />
              </Th>
              <Th>회원</Th>
              <Th>등급</Th>
              <Th>상태</Th>
              <Th>가입일</Th>
              <Th>최근 접속</Th>
              <Th className="pr-[22px] text-right">관리</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => {
              const st = STATUS_META[m.status];
              return (
                <TableRow
                  key={m.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/members/${m.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(`/members/${m.id}`);
                  }}
                  className="cursor-pointer hover:bg-surface-low focus-visible:bg-surface-low focus-visible:outline-none"
                >
                  <TableCell className="pl-[22px]">
                    <Checkbox
                      aria-label={`${m.name} 선택`}
                      className="size-[18px]"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell className="p-3">
                    <div className="flex items-center gap-3">
                      <AvatarMono initial={m.initial} tone={m.avatar} size={38} />
                      <div>
                        <div className="text-[14px] font-medium">{m.name}</div>
                        <div className="text-[12.5px] text-n-50">{m.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="p-3">
                    <TierBadge tier={m.tier} />
                  </TableCell>
                  <TableCell className="p-3">
                    <StatusPill label={st.label} fg={st.fg} bg={st.bg} dot={st.dot} />
                  </TableCell>
                  <TableCell className="p-3 font-mono text-[13px] text-n-30">
                    {m.joined}
                  </TableCell>
                  <TableCell className="p-3 text-[13px] text-n-30">
                    {m.last}
                  </TableCell>
                  <TableCell className="py-3 pl-3 pr-[22px] text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-n-50 hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MaterialSymbol name="more_horiz" size={20} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-[22px] py-3.5">
          <span className="text-[13px] text-n-50">페이지 1 / 1,428</span>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent className="gap-1.5">
              <PaginationItem>
                <PageLink icon="chevron_left" />
              </PaginationItem>
              <PaginationItem>
                <PageLink label="1" active />
              </PaginationItem>
              <PaginationItem>
                <PageLink label="2" />
              </PaginationItem>
              <PaginationItem>
                <PageLink label="3" />
              </PaginationItem>
              <PaginationItem>
                <span className="px-1 text-n-50">…</span>
              </PaginationItem>
              <PaginationItem>
                <PageLink label="1428" />
              </PaginationItem>
              <PaginationItem>
                <PageLink icon="chevron_right" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </SectionCard>
    </div>
  );
}

function PageLink({
  label,
  icon,
  active,
}: {
  label?: string;
  icon?: string;
  active?: boolean;
}) {
  return (
    <PaginationLink
      href="#"
      isActive={active}
      className={cn(
        "size-[34px] min-w-[34px] rounded-lg text-[13px]",
        active
          ? "border-transparent bg-primary font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          : "border border-n-90 bg-card text-foreground hover:bg-secondary",
      )}
    >
      {icon ? <MaterialSymbol name={icon} size={19} /> : label}
    </PaginationLink>
  );
}
