import "server-only";
import { redirect } from "next/navigation";
import { readPrincipal, type AdminPrincipal } from "./session";

/**
 * 보호 라우트·서버 액션의 **유일한** 인가 술어.
 *
 * ⚠️ 이 판정을 다른 파일에 복제하지 마라. 두 벌이 되면 한쪽만 낡는데, 증상이 인가 문제로
 * 읽히지 않는다. 새 관리 라우트·mutation 은 예외 없이 이 모듈을 먼저 부른다.
 *
 * 통과 여부와 «어디로 되돌릴지»는 같은 함수가 정한다. 둘을 따로 두면 한쪽만 바뀐다.
 */
function rejectionOf(principal: AdminPrincipal | null): string | null {
  // 미인증과 인가 실패의 **응답 내용**은 구분하지 않는다(데이터 0바이트). 다만 도착 화면은
  // 상태별로 «다음에 해야 할 한 가지»가 있어야 하므로 경로만 나눈다.
  if (!principal) return "/login";
  if (principal.status === "SETUP_REQUIRED" || !principal.mfaEnabled)
    return "/login/setup";
  // TOTP 를 마치기 전에는 어떤 관리 데이터도 내보내지 않는다.
  if (!principal.mfaSatisfied) return "/login/challenge";
  // 인가 실패를 로그인으로 되돌리면 이미 로그인한 세션이 무한 왕복한다.
  // 종착지는 `/access-denied` 이고 그 화면은 이 관문을 호출하지 않는다.
  if (principal.status !== "ACTIVE") return "/access-denied";
  return null;
}

export function isOperator(
  principal: AdminPrincipal | null,
): principal is AdminPrincipal {
  return rejectionOf(principal) === null;
}

/** 페이지에서 쓴다. 통과하지 못하면 데이터를 한 바이트도 만들지 않고 되돌린다. */
export async function requireOperator(): Promise<AdminPrincipal> {
  const principal = await readPrincipal();
  const rejection = rejectionOf(principal);
  if (rejection) redirect(rejection);
  return principal as AdminPrincipal;
}

/** 서버 액션에서 쓴다. 리다이렉트 대신 결과로 돌려준다. */
export async function requireOperatorOrNull(): Promise<AdminPrincipal | null> {
  const principal = await readPrincipal();
  return isOperator(principal) ? principal : null;
}

/** 역할 기반 쓰기 권한. VIEWER 는 읽기 전용이다. */
export function canWrite(principal: AdminPrincipal): boolean {
  return principal.role === "OWNER" || principal.role === "OPERATOR";
}

/** 계정 운영(초대·역할 변경·비활성화)은 OWNER 만 한다. */
export function canManageAdmins(principal: AdminPrincipal): boolean {
  return principal.role === "OWNER";
}
