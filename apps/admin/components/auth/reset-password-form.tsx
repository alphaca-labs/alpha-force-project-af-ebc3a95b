"use client";

import { useActionState } from "react";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { resetPasswordAction } from "@/lib/auth/actions";
import { AUTH_INITIAL } from "@/lib/auth/form-state";
import { AuthNotice } from "./auth-shell";

export function ResetPasswordForm({ token }: { readonly token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    AUTH_INITIAL,
  );
  return (
    <form
      action={formAction}
      className="shadow-e1 space-y-4 rounded-[12px] border border-n-90 bg-card p-6"
    >
      <AuthNotice error={state.error} notice={state.notice} />
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="password">새 비밀번호</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
        <p className="text-[12px] text-n-50">
          12자 이상 · 유출 이력 검사 통과 필요
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">비밀번호 확인</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "변경 중…" : "비밀번호 변경"}
      </Button>
      <p className="text-[12px] text-n-50">
        변경하면 이 계정의 기존 세션이 모두 종료됩니다.
      </p>
    </form>
  );
}
