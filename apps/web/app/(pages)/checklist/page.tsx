import { redirect } from "next/navigation";
import { CustomerPage, ScreenHead } from "@/components/customer/shell";
import { Checklist } from "@/components/customer/checklist";
import { readSession } from "@/lib/session";
import { buildSimulation } from "@/lib/simulation";

export const dynamic = "force-dynamic";

/** WEB-05 — 실행 체크리스트(FR-019~020). 완료 상태는 브라우저에만 저장한다. */
export default async function ChecklistPage() {
  const session = await readSession();
  const built = await buildSimulation(session);
  if (!built.ok) {
    if (built.failure.kind === "NO_FINANCE") redirect("/finance");
    redirect("/");
  }
  const { roadmap, fingerprint } = built.bundle;

  return (
    <CustomerPage current="/checklist">
      <ScreenHead
        code="WEB-05"
        title="실행 체크리스트"
        description="큰 목표를 이번 주와 이번 달의 체크 한 칸으로 바꿉니다."
      />
      <Checklist missions={roadmap.missions} checklistId={fingerprint} />
    </CustomerPage>
  );
}
