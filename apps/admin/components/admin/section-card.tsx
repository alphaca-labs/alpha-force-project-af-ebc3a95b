import type { ReactNode } from "react";
import { Card } from "@repo/design-system/components/ui/card";
import { cn } from "@repo/design-system/lib/utils";

/**
 * 모노크롬 머티리얼 카드 — DS `Card`를 합성해 시안 룩(라운드 12px / e1 그림자)을 고정.
 * DS Card 기본 `rounded-xl shadow`를 className으로 오버라이드(tailwind-merge가 후순위 적용).
 */
export function SectionCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("rounded-[12px] shadow-e1", className)}>{children}</Card>
  );
}

export function SectionCardHeader({
  title,
  description,
  action,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-border px-[22px] py-[18px]",
        className,
      )}
    >
      <div className="min-w-0">
        {title ? (
          <div className="text-[15px] font-semibold text-foreground">
            {title}
          </div>
        ) : null}
        {description ? (
          <div className="mt-0.5 text-[12.5px] text-n-50">{description}</div>
        ) : null}
      </div>
      {action}
    </div>
  );
}
