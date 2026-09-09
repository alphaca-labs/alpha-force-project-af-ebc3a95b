/** admin 네비게이션 단일 출처 — 사이드바 / 탑바 타이틀 / 커맨드 메뉴가 공유한다. */

export type AdminNavItem = {
  key: string;
  label: string;
  icon: string;
  href: string;
  badge?: string;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { key: "dashboard", label: "대시보드", icon: "dashboard", href: "/" },
  { key: "members", label: "회원 관리", icon: "group", href: "/members", badge: "12.8K" },
  { key: "content", label: "콘텐츠", icon: "article", href: "/content" },
  { key: "payments", label: "결제", icon: "payments", href: "/payments" },
  { key: "settings", label: "설정", icon: "settings", href: "/settings" },
];

export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** 라우트별 페이지 타이틀/크럼 (탑바). */
export function pageMeta(pathname: string): { title: string; crumb: string } {
  if (/^\/members\/[^/]+$/.test(pathname)) {
    return { title: "회원 상세", crumb: "회원 관리 / 회원 상세" };
  }
  const map: Record<string, { title: string; crumb: string }> = {
    "/": { title: "대시보드", crumb: "서비스 핵심 지표 한눈에 보기" },
    "/members": { title: "회원 관리", crumb: "전체 회원 조회 및 관리" },
    "/content": { title: "콘텐츠", crumb: "게시글 작성 및 관리" },
    "/payments": { title: "결제", crumb: "거래 내역 및 매출 현황" },
    "/settings": { title: "설정", crumb: "서비스 환경 설정" },
  };
  return map[pathname] ?? { title: "omniseed", crumb: "" };
}
