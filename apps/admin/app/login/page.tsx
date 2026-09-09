import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { readPrincipal } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** ADM-P01 — 관리자 로그인. */
export default async function LoginPage() {
  const principal = await readPrincipal();
  if (principal) {
    if (principal.status === "SETUP_REQUIRED" || !principal.mfaEnabled)
      redirect("/login/setup");
    if (!principal.mfaSatisfied) redirect("/login/challenge");
    redirect("/properties");
  }
  return (
    <AuthShell
      code="ADM-P01"
      title="관리자 로그인"
      description="승인된 관리자 계정으로 운영 도구에 접속합니다."
    >
      <LoginForm />
      <div className="mt-4 flex items-center justify-between text-[12.5px] text-n-50">
        <Link href="/forgot-password" className="underline underline-offset-4">
          비밀번호 찾기
        </Link>
        <span>반복 실패 시 잠시 잠깁니다</span>
      </div>
    </AuthShell>
  );
}
