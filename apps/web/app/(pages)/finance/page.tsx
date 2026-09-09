import { redirect } from "next/navigation";
import { formatKrwShort } from "@repo/domain";
import { CustomerPage, ScreenHead } from "@/components/customer/shell";
import { FinanceForm } from "@/components/customer/finance-form";
import { getAreaDetail } from "@/lib/repository";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** WEB-02 — 재무 조건 입력(FR-004~005). */
export default async function FinancePage() {
  const session = await readSession();
  if (!session) redirect("/");
  const detail = await getAreaDetail(session.areaId);
  if (!detail || detail.area.price.status !== "available") redirect("/");

  return (
    <CustomerPage current="/finance">
      <ScreenHead
        code="WEB-02"
        title="재무 조건 입력"
        description="대충 말고, 지금 동원 가능한 돈과 매달 늘릴 수 있는 돈을 나눠 적어요."
      />
      <div className="workbench">
        <FinanceForm defaults={session.finance} />
        <aside className="stack">
          <section className="card card-dark">
            <span className="tag">목표 집</span>
            <h2>
              {detail.property.name} {detail.area.label}
            </h2>
            <strong className="goal-price">
              {formatKrwShort(detail.area.price.price)}
            </strong>
            <dl className="stat-strip">
              <div className="stat">
                <dt>기준일</dt>
                <dd>{detail.area.price.baseDate}</dd>
              </div>
              <div className="stat">
                <dt>출처</dt>
                <dd>
                  {detail.area.price.source === "ADMIN_OVERRIDE"
                    ? "운영자 확정"
                    : "실거래 중위가격"}
                </dd>
              </div>
              <div className="stat">
                <dt>유형</dt>
                <dd>{detail.property.typeLabel}</dd>
              </div>
            </dl>
          </section>
          <div className="notice notice-info">
            <strong>입력값은 이 기기에만 머물러요.</strong>
            <br />
            회원가입 없이 계산하고, 성명·주민등록번호·금융기관 인증정보는 받지
            않습니다.
          </div>
        </aside>
      </div>
    </CustomerPage>
  );
}
