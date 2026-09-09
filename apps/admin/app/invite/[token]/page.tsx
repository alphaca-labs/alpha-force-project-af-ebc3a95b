import { hashToken } from "@repo/security";
import { getUsableInvitation } from "@/lib/admin-data";
import { AuthShell } from "@/components/auth/auth-shell";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";

export const dynamic = "force-dynamic";

const ROLE_LABEL = {
  OWNER: "최고 관리자",
  OPERATOR: "운영자",
  VIEWER: "읽기 전용",
} as const;

/** ADM-P06 — 초대 수락. 이메일·역할은 읽기 전용이다. */
export default async function InvitePage({
  params,
}: {
  readonly params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getUsableInvitation(hashToken(token));

  if (!invitation) {
    return (
      <AuthShell
        code="ADM-P06"
        title="관리자 초대 수락"
        description="이 초대는 더 이상 사용할 수 없습니다."
      >
        <div className="shadow-e1 rounded-[12px] border border-n-90 bg-card p-6 text-[13.5px]">
          초대가 만료되었거나 이미 사용되었습니다. 초대한 운영자에게 다시 요청해
          주세요.
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      code="ADM-P06"
      title="관리자 초대 수락"
      description="초대 내용을 확인하고 비밀번호를 설정하세요."
    >
      <div className="shadow-e1 mb-4 rounded-[12px] border border-n-90 bg-card p-5 text-[13.5px]">
        <div className="flex items-center justify-between py-1">
          <span className="text-n-50">초대 이메일</span>
          <span className="font-mono">{invitation.email}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-n-50">역할</span>
          <span>{ROLE_LABEL[invitation.role]}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-n-50">만료</span>
          <span className="font-mono">
            {invitation.expiresAt.toISOString().slice(0, 16).replace("T", " ")}
          </span>
        </div>
      </div>
      <AcceptInviteForm token={token} />
    </AuthShell>
  );
}
