"use client";

import { useActionState } from "react";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { acceptInviteAction } from "@/lib/auth/actions";
import { AUTH_INITIAL } from "@/lib/auth/form-state";
import { AuthNotice } from "./auth-shell";

export function AcceptInviteForm({ token }: { readonly token: string }) {
  const [state, formAction, pending] = useActionState(
    acceptInviteAction,
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
        <Label htmlFor="name">이름</Label>
        <Input id="name" name="name" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
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
        {pending ? "처리 중…" : "초대 수락"}
      </Button>
      <p className="text-[12px] text-n-50">
        수락 후 첫 로그인에서 인증 앱 등록을 마쳐야 운영 화면이 열립니다.
      </p>
    </form>
  );
}
