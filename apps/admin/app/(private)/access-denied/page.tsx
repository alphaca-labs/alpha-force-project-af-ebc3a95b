import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@repo/design-system/components/ui/button";
import { SectionCard } from "@/components/admin/section-card";
import { readPrincipal } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

/**
 * ADM-R07 — 접근 권한 없음.
 *
 * ⚠️ 이 화면은 관문(`requireOperator`)을 호출하지 않는다. 인가 실패의 종착지가 다시 관문을
 * 부르면 무한 왕복이 된다. 대신 세션만 읽어 «필요 권한»과 «돌아갈 경로»만 보여 준다.
 * 어떤 대상 때문에 막혔는지는 적지 않는다(존재 오라클이 된다).
 */
export default async function AccessDeniedPage() {
  const principal = await readPrincipal();
  if (!principal) redirect("/login");

  const ROLE_LABEL = {
    OWNER: "최고 관리자",
    OPERATOR: "운영자",
    VIEWER: "읽기 전용",
  } as const;

  return (
    <SectionCard className="mx-auto max-w-[560px] p-8">
      <span className="inline-flex rounded-full bg-destructive/10 px-2.5 py-1 text-[12px] font-semibold text-destructive">
        접근 권한 없음
      </span>
      <h1 className="mt-3 text-[22px] font-bold tracking-[-0.02em]">
        이 화면을 열 권한이 없어요.
      </h1>
      <p className="mt-2 text-[13.5px] text-n-50">
        현재 역할은 {ROLE_LABEL[principal.role]}입니다. 필요한 권한은 운영
        책임자에게 요청해 주세요.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href="/properties">허용된 화면으로 이동</Link>
        </Button>
        <form action={logoutAction}>
          <Button variant="outline" type="submit">
            로그아웃
          </Button>
        </form>
      </div>
    </SectionCard>
  );
}
