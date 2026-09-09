"use client";

import { useActionState } from "react";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { saveRuleVersionAction } from "@/lib/operations";
import { OPERATION_INITIAL } from "@/lib/auth/form-state";

export function RuleVersionForm({
  baseVersionId,
  defaults,
}: {
  readonly baseVersionId: string;
  readonly defaults: {
    readonly ltv: number;
    readonly dsr: number;
    readonly annualRateMin: number;
    readonly annualRateMax: number;
    readonly termYears: number;
    readonly maxAmount: number;
  };
}) {
  const [state, formAction, pending] = useActionState(
    saveRuleVersionAction,
    OPERATION_INITIAL,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="baseVersionId" value={baseVersionId} />
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
          <Label htmlFor="ltv">LTV (0~1)</Label>
          <Input
            id="ltv"
            name="ltv"
            inputMode="decimal"
            defaultValue={defaults.ltv}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dsr">DSR (0~1)</Label>
          <Input
            id="dsr"
            name="dsr"
            inputMode="decimal"
            defaultValue={defaults.dsr}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="annualRateMin">최저 금리 (0~1)</Label>
          <Input
            id="annualRateMin"
            name="annualRateMin"
            inputMode="decimal"
            defaultValue={defaults.annualRateMin}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="annualRateMax">최고 금리 (0~1)</Label>
          <Input
            id="annualRateMax"
            name="annualRateMax"
            inputMode="decimal"
            defaultValue={defaults.annualRateMax}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="termYears">상환 기간 (년)</Label>
          <Input
            id="termYears"
            name="termYears"
            inputMode="numeric"
            defaultValue={defaults.termYears}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxAmount">상품 최대 한도 (원)</Label>
          <Input
            id="maxAmount"
            name="maxAmount"
            inputMode="numeric"
            defaultValue={defaults.maxAmount}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="effectiveFrom">새 버전 시행일</Label>
          <Input id="effectiveFrom" name="effectiveFrom" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="effectiveTo">종료일 (선택)</Label>
          <Input id="effectiveTo" name="effectiveTo" type="date" />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : "새 버전 저장"}
      </Button>
      <p className="text-[12px] text-n-50">
        같은 상품의 활성 버전과 유효기간이 겹치면 저장이 막힙니다. 기존 버전의
        종료일을 먼저 정해 주세요.
      </p>
    </form>
  );
}
