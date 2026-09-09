import NextAuth, { type NextAuthResult } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

/**
 * 🚨 이 파일에 자격증명 리터럴을 다시 넣지 마라.
 *
 * 템플릿 원본은 `login === "admin" && password === "1234"` 를 그대로 통과시켰고, 이 저장소에서
 * 파생된 제품 20개가 같은 분기를 물려받았다. 화면의 «데모 계정» 안내를 지우는 파생본이 나오면서
 * 단서만 사라지고 우회로는 남는 상태가 됐다 — admin 앱을 배포하는 순간 전부 열린다.
 *
 * 지금 계약:
 *   - 리터럴 없음. 개발용 로그인은 `ADMIN_DEV_LOGIN`·`ADMIN_DEV_PASSWORD` 가 **둘 다** 있을 때만.
 *   - `NODE_ENV === "production"` 이면 그 분기 자체가 없다. env 를 넣어도 통과하지 않는다.
 *   - 실패는 전부 `return null` 하나로 붕괴시킨다(계정 존재 여부를 노출하지 않는다).
 *     `throw` 를 쓰면 Auth.js 가 `CallbackRouteError` 로 감싸 사유가 로그·응답으로 갈린다.
 *
 * ⛔ 정식 해결은 `AdminAccount` 모델 + 해시 검증(argon2/bcrypt) + 일회용 활성화 링크(FR-018)다.
 *    이 파일은 그때까지 «리터럴로 열려 있지 않은» 상태를 유지하는 임시 계약이고, 그 작업은
 *    omniseed issue #29 "auth package" 에 붙인다(새 이슈를 만들지 마라).
 *
 * ⚠️ `proxy.ts` 가 이 모듈을 미들웨어로 가져간다 — `node:crypto` 등 Node 전용 API 를 import 하면
 *    엣지 번들이 깨진다. 아래 비교가 순수 JS 인 이유다.
 */
function timingSafeEquals(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

function devCredentials() {
  if (process.env.NODE_ENV === "production") return null;
  const login = process.env.ADMIN_DEV_LOGIN ?? "";
  const password = process.env.ADMIN_DEV_PASSWORD ?? "";
  if (!login || !password) return null;
  return { login, password };
}

const result = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      credentials: {
        login: { label: "login", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }
        const login = typeof credentials.login === "string" ? credentials.login : "";
        const password =
          typeof credentials.password === "string" ? credentials.password : "";
        const allowed = devCredentials();
        if (
          allowed &&
          timingSafeEquals(login, allowed.login) &&
          timingSafeEquals(password, allowed.password)
        ) {
          return {
            id: login,
            name: login,
            email: `${login}@localhost`,
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async authorized({ request, auth }) {
      return !!auth?.user;
    },
  },
});

export const handlers: NextAuthResult["handlers"] = result.handlers;
export const auth: NextAuthResult["auth"] = result.auth;
export const signIn: NextAuthResult["signIn"] = result.signIn;
export const signOut: NextAuthResult["signOut"] = result.signOut;
