"use client";

import { useActionState } from "react";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { loginAction } from "@/lib/auth/actions";
import { AUTH_INITIAL } from "@/lib/auth/form-state";
import { AuthNotice } from "./auth-shell";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    AUTH_INITIAL,
  );
  return (
    <form
      action={formAction}
      className="shadow-e1 space-y-4 rounded-[12px] border border-n-90 bg-card p-6"
    >
      <AuthNotice error={state.error} notice={state.notice} />
      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}
