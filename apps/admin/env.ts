import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  extends: [],
  server: {
    AUTH_SECRET: z.string().min(1),
    // 개발 전용 로그인. `auth.ts` 는 **둘 다** 있고 `NODE_ENV !== "production"` 일 때만 통과시킨다.
    // 운영에 넣어도 아무 효과가 없다(그쪽 분기 자체가 없다). 여기 선언해 두는 이유는
    // `.env.example` 과 함께 이 두 키의 **유일한 계약**이 되게 하기 위해서다.
    ADMIN_DEV_LOGIN: z.string().min(1).optional(),
    ADMIN_DEV_PASSWORD: z.string().min(8).optional(),
  },
  client: {},
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    ADMIN_DEV_LOGIN: process.env.ADMIN_DEV_LOGIN,
    ADMIN_DEV_PASSWORD: process.env.ADMIN_DEV_PASSWORD,
  },
});
