# syntax=docker/dockerfile:1
# Spec: 040-omniseed-docker-flavors (T008, FR-001/FR-003/FR-007/FR-009)
#
# apps/web (Next.js) 미리보기 이미지. 빌드 컨텍스트는 저장소 루트다:
#   docker build --platform=linux/amd64 -f apps/web/Dockerfile -t omniseed-web .
#
# 이 파일은 `default` flavor 에서만 살아남는다(bootstrap 이 apps/web 을 보존).
# apps/admin 은 의도적으로 Dockerfile 이 없다 — `/` 가 인증 리다이렉트(307)라
# 3xx 를 실패로 보는 헬스 프로브를 구조적으로 통과할 수 없다.

FROM node:24-alpine AS base
# Next.js 의 네이티브 바이너리(SWC/Turbopack)가 musl 에서 glibc 호환 심볼을 찾는다.
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack install -g pnpm@10.26.0
WORKDIR /app

FROM base AS builder
ENV CI=true
COPY . .
# `web` + 그 워크스페이스 의존성만 설치한다(`...` 접미사). flavor 프루닝으로 어떤
# 앱이 사라지든 동작하고, 설치량도 워크스페이스 전체 대비 크게 줄어든다.
# --no-frozen-lockfile: 생성된 프로젝트는 코드 생성 단계에서 package.json 에
# 의존성이 추가된 뒤 lockfile 이 갱신되지 않은 상태로 도착할 수 있다. 그때
# 하드 실패시키는 대신 해석하도록 둔다(미리보기 빌드라 재현성보다 기동이 우선).
RUN pnpm install --no-frozen-lockfile --filter web...
# 빌드 전용 더미 DATABASE_URL — 실제 시크릿이 아니고 이 스테이지 밖으로 나가지 않는다.
# 사유: packages/database/client.ts 가 gitignore 된 ./generated/prisma/client 를
# import 하므로 `prisma generate` 가 선행돼야 하는데, prisma.config.ts 의
# env("DATABASE_URL") 은 값이 없으면 throw 한다. generate 는 DB 에 접속하지 않는다.
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" \
    pnpm --filter @repo/database build
RUN pnpm --filter web build

# 런타임 스테이지 — 시크릿 0건(빌드 더미 DATABASE_URL 은 여기로 넘어오지 않는다).
# pnpm 도 두지 않는다: standalone 산출물은 자기 완결형이라 node 만 있으면 뜬다.
FROM node:24-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
# 포트는 이미지가 스스로 확정해야 한다: 미리보기 런타임은 env 를 1건도 주입하지 않고,
# 배포 도구는 아래 EXPOSE 리터럴을 그대로 컨테이너 포트로 사용한다.
# 앱 기본 포트 == EXPOSE 리터럴 == ENV PORT, 3자가 반드시 일치해야 한다.
ENV PORT=3000
# Next standalone 의 server.js 는 process.env.HOSTNAME 으로 바인딩 주소를 정하는데,
# 도커가 HOSTNAME 에 컨테이너 ID 를 넣기 때문에 명시하지 않으면 바인딩이 실패한다.
ENV HOSTNAME=0.0.0.0
# next.config.ts 의 output:"standalone" + outputFileTracingRoot 세트가 만든 산출물.
# 여기서 node_modules 를 부분 COPY 하면 pnpm isolated symlink farm 이 끊어져 죽는다.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
# EXPOSE 는 마지막(런타임) 스테이지에만, 파일당 1줄·리터럴 1개로 둔다. 배포 도구는
# Dockerfile 에서 EXPOSE 를 한 줄만 단순 파싱하고 실패하면 기본 포트로 폴백하는 경우가
# 많다. 변수(${PORT})·후행 주석·복수 EXPOSE 는 그래서 조용히 어긋난다.
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
