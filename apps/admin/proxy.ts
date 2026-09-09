import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/cookie";

/**
 * 엣지 관문.
 *
 * 여기서는 **쿠키가 있는지만** 본다. 세션 유효성·MFA·역할은 DB 를 읽어야 하고 엣지에서는
 * Prisma 를 쓸 수 없으므로, 실제 인가는 `lib/auth/guard.ts::requireOperator` 하나가 소유한다.
 * 이 파일은 그 판정을 복제하지 않는다 — 두 벌이 되면 한쪽만 낡는다.
 *
 * `PUBLIC_PATHS` 는 **정확 일치**만 쓴다. 접두 매칭(`/login/*`)을 넣으면 보호 구역까지 함께
 * 열리므로, 하위 경로가 필요하면 그 경로를 직접 적는다.
 */
const PUBLIC_PATHS = new Set([
  "/login",
  "/login/challenge",
  "/login/setup",
  "/forgot-password",
  "/robots.txt",
  "/api/health",
  // 시스템 수집 엔드포인트는 SSO 쿠키가 없다. 관문은 라우트 안의 공유 secret 이며
  // 서명 검증보다 앞에 DB·외부 호출을 두지 않는다.
  "/api/ingestion",
]);

/** 토큰이 경로에 실리는 공개 인증 흐름. 이 둘만 접두 매칭을 허용한다. */
const PUBLIC_PREFIXES = ["/reset-password/", "/invite/"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)))
    return NextResponse.next();

  if (!request.cookies.get(ADMIN_SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

/**
 * deny-by-default. 화이트리스트로 되돌리지 마라 — 새 페이지의 보호 누락이 조용해진다.
 * 확장자 제외는 유지한다(빼면 정적 자산이 302 가 된다).
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
