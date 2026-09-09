import { Badge } from "@repo/design-system/components/ui/badge";
import { MaterialSymbol } from "@repo/design-system/components/ui/material-symbol";
import { cn } from "@repo/design-system/lib/utils";
import { TIER_META, type TierKey } from "@/lib/mock";

/**
 * 상태 pill (dot + 라벨) — DS `Badge`(outline) 합성. 색 값은 mock의 *_STATUS_META 단일 출처.
 */
export function StatusPill({
  label,
  fg,
  bg,
  dot,
}: {
  label: string;
  fg: string;
  bg: string;
  dot?: string;
}) {
  return (
    <Badge
      variant="outline"
      className="gap-1.5 rounded-full border-transparent px-2.5 py-1 text-[12px]"
      style={{ color: fg, background: bg }}
    >
      {dot ? (
        <span
          className="size-1.5 rounded-full"
          style={{ background: dot }}
          aria-hidden
        />
      ) : null}
      {label}
    </Badge>
  );
}

/** 등급 뱃지 — 채움 아이콘 + 라벨(칩 배경 없는 인라인 라벨). TIER_META 단일 출처. */
export function TierBadge({ tier, className }: { tier: TierKey; className?: string }) {
  const t = TIER_META[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12.5px] font-medium text-foreground",
        className,
      )}
    >
      <MaterialSymbol name={t.icon} filled size={15} style={{ color: t.color }} />
      {t.label}
    </span>
  );
}
