import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const dynamic = "force-dynamic";

/** ADM-P04 — 재설정 요청. 계정 존재 여부를 노출하지 않는다. */
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      code="ADM-P04"
      title="비밀번호 재설정 요청"
      description="계정 이메일로 재설정 링크를 보냅니다."
    >
      <ForgotPasswordForm />
      <div className="mt-4 text-[12.5px]">
        <Link href="/login" className="underline underline-offset-4">
          로그인으로 돌아가기
        </Link>
      </div>
    </AuthShell>
  );
}
