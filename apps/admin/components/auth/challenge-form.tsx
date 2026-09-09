"use client";

import { useActionState } from "react";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { challengeAction } from "@/lib/auth/actions";
import { AUTH_INITIAL } from "@/lib/auth/form-state";
import { AuthNotice } from "./auth-shell";

export function ChallengeForm() {
  const [state, formAction, pending] = useActionState(
    challengeAction,
    AUTH_INITIAL,
  );
  return (
    <form
      action={formAction}
      className="shadow-e1 space-y-4 rounded-[12px] border border-n-90 bg-card p-6"
    >
      <AuthNotice error={state.error} notice={state.notice} />
      <div className="space-y-2">
        <Label htmlFor="code">인증 코드</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="\d{6}"
          className="text-center font-mono text-[22px] tracking-[0.4em]"
          required
        />
        <p className="text-[12px] text-n-50">
          코드는 30초마다 바뀝니다. 붙여넣기도 됩니다.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "확인 중…" : "코드 확인"}
      </Button>
    </form>
  );
}
