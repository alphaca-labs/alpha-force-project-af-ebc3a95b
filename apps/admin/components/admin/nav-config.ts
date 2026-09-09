/** admin 네비게이션 단일 출처 — 사이드바 / 탑바 타이틀 / 커맨드 메뉴가 공유한다. */

export type AdminNavItem = {
  key: string;
  label: string;
  icon: string;
  href: string;
  badge?: string;
};

export const ADMIN_NAV: AdminNavItem[] = [
  {
    key: "properties",
    label: "매물 시세",
    icon: "apartment",
    href: "/properties",
  },
  { key: "rules", label: "대출·청약 규칙", icon: "rule", href: "/rules" },
  { key: "admins", label: "운영자", icon: "group", href: "/admins" },
  { key: "audit", label: "감사 기록", icon: "history", href: "/audit-logs" },
];

export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** 라우트별 페이지 타이틀/크럼 (탑바). */
export function pageMeta(pathname: string): { title: string; crumb: string } {
  if (/^\/properties\/[^/]+\/areas\/[^/]+$/.test(pathname)) {
    return { title: "면적 가격 상세", crumb: "매물 시세 / 면적 가격 상세" };
  }
  if (/^\/rules\/[^/]+$/.test(pathname)) {
    return { title: "계산 규칙 상세", crumb: "대출·청약 규칙 / 규칙 상세" };
  }
  const map: Record<string, { title: string; crumb: string }> = {
    "/properties": {
      title: "매물·면적 관리",
      crumb: "단지와 면적별 가격 데이터",
    },
    "/rules": {
      title: "계산 규칙 관리",
      crumb: "대출·청약 규칙의 버전과 활성 상태",
    },
    "/admins": { title: "관리자 계정", crumb: "역할·상태·초대 관리" },
    "/audit-logs": { title: "감사 로그", crumb: "운영 데이터 변경 이력" },
    "/access-denied": { title: "접근 권한 없음", crumb: "" },
  };
  return map[pathname] ?? { title: "뭐해야집사냐 운영", crumb: "" };
}
