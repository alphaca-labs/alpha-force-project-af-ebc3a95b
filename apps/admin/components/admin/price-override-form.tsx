"use client";

import { useActionState } from "react";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { savePriceOverrideAction } from "@/lib/operations";
import { OPERATION_INITIAL } from "@/lib/auth/form-state";

export function PriceOverrideForm({
  areaId,
  defaultPrice,
  defaultBaseDate,
  defaultSourceLabel,
  defaultMemo,
  expectedVersionAt,
}: {
  readonly areaId: string;
  readonly defaultPrice: number;
  readonly defaultBaseDate: string;
  readonly defaultSourceLabel: string;
  readonly defaultMemo: string;
  readonly expectedVersionAt: string;
}) {
  const [state, formAction, pending] = useActionState(
    savePriceOverrideAction,
    OPERATION_INITIAL,
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="areaId" value={areaId} />
      <input type="hidden" name="expectedVersionAt" value={expectedVersionAt} />
      {state.error ? (
        <p
          role="alert"
          className="rounded-[10px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive"
        >
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p
          role="status"
          className="rounded-[10px] border border-n-90 bg-secondary px-4 py-3 text-[13px]"
        >
          {state.notice}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price">확정 시세 (원)</Label>
          <Input
            id="price"
            name="price"
            inputMode="numeric"
            defaultValue={String(defaultPrice)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="baseDate">가격 기준일</Label>
          <Input
            id="baseDate"
            name="baseDate"
            type="date"
            defaultValue={defaultBaseDate}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="effectiveFrom">적용 시작일</Label>
          <Input
            id="effectiveFrom"
            name="effectiveFrom"
            type="date"
            defaultValue={today}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sourceLabel">가격 출처</Label>
          <Input
            id="sourceLabel"
            name="sourceLabel"
            defaultValue={defaultSourceLabel}
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="memo">운영 메모</Label>
          <Textarea id="memo" name="memo" defaultValue={defaultMemo} rows={3} />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : "새 값 저장"}
      </Button>
    </form>
  );
}
