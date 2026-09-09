"use client";

import { useActionState } from "react";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { setupAction } from "@/lib/auth/actions";
import { AUTH_INITIAL } from "@/lib/auth/form-state";
import { AuthNotice } from "./auth-shell";

export function SetupForm({
  secret,
  uri,
  email,
}: {
  readonly secret: string;
  readonly uri: string;
  readonly email: string;
}) {
  const [state, formAction, pending] = useActionState(
    setupAction,
    AUTH_INITIAL,
  );
  return (
    <form
      action={formAction}
      className="shadow-e1 space-y-5 rounded-[12px] border border-n-90 bg-card p-6"
    >
      <AuthNotice error={state.error} notice={state.notice} />
      <input type="hidden" name="secret" value={secret} />

      <section className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-[15px] font-semibold">1. 인증 앱에 등록</h2>
          <p className="text-[12.5px] text-n-50">
            QR 스캐너 대신 아래 설정 키를 인증 앱에 직접 입력해도 됩니다. 이
            값은 이 화면에서만 보입니다.
          </p>
          <div className="rounded-[10px] border border-n-90 bg-secondary p-3">
            <div className="text-[11px] text-n-50">계정</div>
            <div className="font-mono text-[12.5px]">{email}</div>
            <div className="mt-2 text-[11px] text-n-50">설정 키</div>
            <div className="font-mono text-[13px] font-semibold break-all">
              {secret}
            </div>
            <div className="mt-2 text-[11px] text-n-50">otpauth URI</div>
            <div className="font-mono text-[10.5px] break-all text-n-50">
              {uri}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-[15px] font-semibold">2. 새 비밀번호와 코드</h2>
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
              12자 이상 · 현재 비밀번호와 달라야 하며 유출 이력 검사를 통과해야
              합니다.
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
          <div className="space-y-2">
            <Label htmlFor="code">앱에 나온 코드</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              maxLength={6}
              pattern="\d{6}"
              className="text-center font-mono text-[20px] tracking-[0.4em]"
              required
            />
          </div>
        </div>
      </section>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "설정 중…" : "설정 완료"}
      </Button>
    </form>
  );
}
