import {
  listFeaturedProperties,
  FEATURED_LIMIT,
  SEARCH_LIMIT,
} from "@/lib/repository";
import { CustomerPage, ScreenHead } from "@/components/customer/shell";
import { TargetSearch } from "@/components/customer/target-search";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** WEB-01 — 목표 집 탐색(FR-001~003). */
export default async function TargetSearchPage() {
  const [featured, session] = await Promise.all([
    listFeaturedProperties(),
    readSession(),
  ]);
  return (
    <CustomerPage current="/">
      <ScreenHead
        code="WEB-01"
        title="목표 집 탐색"
        description="사고 싶은 집을 먼저 골라요. 숫자는 그다음에 냉정하게 계산합니다."
      />
      <TargetSearch
        featured={featured}
        featuredLimit={FEATURED_LIMIT}
        searchLimit={SEARCH_LIMIT}
        selectedAreaId={session?.areaId ?? null}
      />
    </CustomerPage>
  );
}
