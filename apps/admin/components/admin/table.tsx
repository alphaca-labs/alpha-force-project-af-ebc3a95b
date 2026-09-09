import { TableHead } from "@repo/design-system/components/ui/table";
import { cn } from "@repo/design-system/lib/utils";
import type { ComponentProps } from "react";

/**
 * 회원/결제 테이블 헤더 셀 — DS `TableHead`를 합성해 11.5px 대문자 라벨 스타일을 단일 출처로 고정.
 * (소형 텍스트 AA 여유 위해 text-n-40 — arch 접근성 권고)
 */
export function Th({
  className,
  ...props
}: ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      className={cn(
        "h-auto px-3 py-[11px] text-[11.5px] font-semibold tracking-[0.03em] text-n-40",
        className,
      )}
      {...props}
    />
  );
}
