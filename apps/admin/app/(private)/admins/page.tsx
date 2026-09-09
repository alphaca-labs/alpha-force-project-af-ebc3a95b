import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  SectionCard,
  SectionCardHeader,
} from "@/components/admin/section-card";
import { Th } from "@/components/admin/table";
import { InviteForm } from "@/components/admin/invite-form";
import { listAdmins } from "@/lib/admin-data";
import { requireOperator, canManageAdmins } from "@/lib/auth/guard";
import { setAdminStatusAction } from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL = {
  OWNER: "최고 관리자",
  OPERATOR: "운영자",
  VIEWER: "읽기 전용",
} as const;
const STATUS_LABEL = {
  SETUP_REQUIRED: "설정 대기",
  ACTIVE: "활성",
  INACTIVE: "비활성",
} as const;

/** ADM-R05 — 관리자 계정(FR-031 · FR-033~034). */
export default async function AdminsPage() {
  const principal = await requireOperator();
  const { accounts, invitations } = await listAdmins();
  const manage = canManageAdmins(principal);
  const activeCount = accounts.filter((a) => a.status === "ACTIVE").length;

  return (
    <div className="space-y-5">
      {manage ? <InviteForm /> : null}

      <SectionCard>
        <SectionCardHeader
          title="관리자"
          description={`총 ${accounts.length}명 · 활성 ${activeCount}명`}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <Th>이름</Th>
              <Th>이메일</Th>
              <Th>역할</Th>
              <Th>상태</Th>
              <Th>2단계 인증</Th>
              <Th>최근 접속</Th>
              <Th>행동</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => {
              const self = account.id === principal.adminId;
              const lastActive =
                activeCount <= 1 && account.status === "ACTIVE";
              return (
                <TableRow key={account.id}>
                  <TableCell className="font-semibold">
                    {account.name}
                    {self ? (
                      <span className="ml-2 text-[11px] text-n-50">나</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-[12.5px]">
                    {account.email}
                  </TableCell>
                  <TableCell>{ROLE_LABEL[account.role]}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        account.status === "ACTIVE" ? "secondary" : "outline"
                      }
                    >
                      {STATUS_LABEL[account.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {account.mfaEnabled ? "등록됨" : "미등록"}
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-n-50">
                    {account.lastLoginAt
                      ? account.lastLoginAt
                          .toISOString()
                          .slice(0, 16)
                          .replace("T", " ")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {manage && !self && !lastActive ? (
                      <form action={setAdminStatusAction}>
                        <input
                          type="hidden"
                          name="adminId"
                          value={account.id}
                        />
                        <input
                          type="hidden"
                          name="status"
                          value={
                            account.status === "INACTIVE"
                              ? "ACTIVE"
                              : "INACTIVE"
                          }
                        />
                        <Button variant="ghost" size="sm" type="submit">
                          {account.status === "INACTIVE"
                            ? "재활성화"
                            : "비활성화"}
                        </Button>
                      </form>
                    ) : (
                      <span className="text-[12px] text-n-50">
                        {self
                          ? "현재 계정"
                          : lastActive
                            ? "마지막 활성 계정"
                            : "권한 없음"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard>
        <SectionCardHeader
          title="대기 중 초대"
          description="초대는 지정 이메일 전용이고 24시간 뒤 만료됩니다."
        />
        {invitations.length === 0 ? (
          <p className="p-[22px] text-[13.5px] text-n-50">
            대기 중인 초대가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex items-center justify-between px-[22px] py-3 text-[13px]"
              >
                <span className="font-mono">{invitation.email}</span>
                <span className="text-n-50">
                  {ROLE_LABEL[invitation.role]} · 만료{" "}
                  {invitation.expiresAt
                    .toISOString()
                    .slice(0, 16)
                    .replace("T", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
