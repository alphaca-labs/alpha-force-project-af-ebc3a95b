import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const dynamic = "force-dynamic";

/** ADM-P05 — 새 비밀번호 설정. 토큰 유효성은 제출 시 서버가 판정한다. */
export default async function ResetPasswordPage({
  params,
}: {
  readonly params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <AuthShell
      code="ADM-P05"
      title="새 비밀번호 설정"
      description="새 비밀번호는 이전 비밀번호와 달라야 하고 12자 이상이어야 합니다."
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
