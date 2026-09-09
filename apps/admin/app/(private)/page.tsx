import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** 운영자 `/` 는 별도 대시보드를 만들지 않고 매물 시세로 보낸다(PRD 5.1). */
export default function AdminRootPage() {
  redirect("/properties");
}
