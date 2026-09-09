import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ChallengeForm } from "@/components/auth/challenge-form";
import { readPrincipal } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** ADM-P02 — 2단계 인증. 완료 전에는 관리 데이터를 한 바이트도 내보내지 않는다. */
export default async function ChallengePage() {
  const principal = await readPrincipal();
  if (!principal) redirect("/login");
  if (principal.status === "SETUP_REQUIRED" || !principal.mfaEnabled)
    redirect("/login/setup");
  if (principal.mfaSatisfied) redirect("/properties");

  return (
    <AuthShell
      code="ADM-P02"
      title="2단계 인증"
      description="인증 앱에 표시된 6자리 코드를 입력하세요."
    >
      <ChallengeForm />
    </AuthShell>
  );
}
