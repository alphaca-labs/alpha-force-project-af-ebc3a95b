/**
 * 세션 쿠키 이름 하나만 두는 모듈.
 *
 * `proxy.ts`(엣지 미들웨어)와 `lib/auth/session.ts`(Node 서버) 가 같은 이름을 써야 하는데,
 * session.ts 는 `server-only`·Prisma 를 물고 있어 엣지 번들에 들어갈 수 없다.
 * 그래서 **문자열 하나만** 여기로 뽑아 양쪽이 같은 상수를 참조하게 한다(두 벌 금지).
 */
export const ADMIN_SESSION_COOKIE = "zipsanya.admin";
