import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  extends: [],
  server: {
    DATABASE_URL: z.string().url(),
    /** TOTP secret 저장 암호화 키. 16자 이상. 값이 바뀌면 기존 secret 을 복호화할 수 없다. */
    AUTH_ENCRYPTION_KEY: z.string().min(16),
    /** 초대·재설정 메일. 없으면 발송하지 않고 «보냈다»고 표시하지도 않는다. */
    RESEND_TOKEN: z.string().optional(),
    RESEND_FROM: z.string().optional(),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_ENCRYPTION_KEY: process.env.AUTH_ENCRYPTION_KEY,
    RESEND_TOKEN: process.env.RESEND_TOKEN,
    RESEND_FROM: process.env.RESEND_FROM,
  },
});
