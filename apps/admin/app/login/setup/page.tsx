import { redirect } from "next/navigation";
import { generateTotpSecret, totpUri } from "@repo/security";
import { AuthShell } from "@/components/auth/auth-shell";
import { SetupForm } from "@/components/auth/setup-form";
import { readPrincipal } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * ADM-P03 — 최초 로그인 설정(FR-036).
 *
 * secret 은 요청마다 새로 만들고 확인 전까지 저장하지 않는다. 확인 후에는 암호화해 저장하고
 * 이 화면 밖에서는 다시 보여 주지 않는다.
 */
export default async function SetupPage() {
  const principal = await readPrincipal();
  if (!principal) redirect("/login");
  if (principal.status === "ACTIVE" && principal.mfaEnabled) {
    redirect(principal.mfaSatisfied ? "/properties" : "/login/challenge");
  }

  const secret = generateTotpSecret();
  const uri = totpUri({
    secret,
    email: principal.email,
    issuer: "뭐해야집사냐 운영",
  });

  return (
    <AuthShell
      code="ADM-P03"
      title="2단계 인증 설정"
      description="비밀번호를 새로 정하고 인증 앱을 연결해야 운영 화면을 열 수 있습니다."
      wide
    >
      <SetupForm secret={secret} uri={uri} email={principal.email} />
    </AuthShell>
  );
}
