import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * `prisma generate` 는 데이터베이스에 접속하지 않는다. 그런데 `env("DATABASE_URL")` 은
 * 값이 없으면 그 자리에서 던져서, env 가 주입되지 않는 CI·컨테이너 빌드에서
 * `packages/database` 의 build(=generate) 가 통째로 죽었다.
 *
 * 그래서 접속 문자열은 **런타임에만** 필수다. 여기서는 없을 때 접속 불가능한 자리표시자를
 * 넣어 generate 가 통과하게 하고, 실제 접속은 `client.ts` 가 `process.env.DATABASE_URL`
 * 로 직접 만든다(자리표시자로는 어떤 쿼리도 성공하지 않는다).
 */
const PLACEHOLDER =
  "postgresql://placeholder:placeholder@127.0.0.1:1/placeholder";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? PLACEHOLDER,
  },
});
