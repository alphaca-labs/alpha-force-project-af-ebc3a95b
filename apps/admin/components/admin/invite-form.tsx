"use client";

import { useActionState } from "react";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { SectionCard, SectionCardHeader } from "./section-card";
import { inviteAdminAction } from "@/lib/auth/actions";
import { AUTH_INITIAL } from "@/lib/auth/form-state";

export function InviteForm() {
  const [state, formAction, pending] = useActionState(
    inviteAdminAction,
    AUTH_INITIAL,
  );
  return (
    <SectionCard>
      <SectionCardHeader
        title="관리자 초대"
        description="업무에 필요한 최소 권한을 선택하세요."
      />
      <form
        action={formAction}
        className="grid gap-4 p-[22px] md:grid-cols-[1fr_200px_auto]"
      >
        {state.error ? (
          <p
            role="alert"
            className="rounded-[10px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive md:col-span-3"
          >
            {state.error}
          </p>
        ) : null}
        {state.notice ? (
          <p
            role="status"
            className="rounded-[10px] border border-n-90 bg-secondary px-4 py-3 text-[13px] md:col-span-3"
          >
            {state.notice}
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="invite-email">이메일</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            placeholder="name@company.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">역할</Label>
          <select
            id="invite-role"
            name="role"
            defaultValue="OPERATOR"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="VIEWER">읽기 전용</option>
            <option value="OPERATOR">운영자</option>
            <option value="OWNER">최고 관리자</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending}>
            {pending ? "보내는 중…" : "초대 보내기"}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
