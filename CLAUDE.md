# CLAUDE.md

## Project Overview

**뭐해야집사냐?** — 비로그인 방문자가 목표 주택과 재정 조건을 넣으면 자금 격차·예상 기간·실행
로드맵을 계산하는 서비스와, 시세·대출 규칙·계정을 관리하는 운영 백오피스.

요구사항 정본은 `docs/ref/prd/`(FR-001~037, FLOW-001~005)다. **이 파일들은 바이트를 바꾸지 마라.**
문서와 코드가 어긋나면 PRD가 우선이고, PRD에 없는 기능은 추가하지 않는다.

Turborepo + pnpm 모노레포. Next.js 16 / React 19 / Prisma 7 / Tailwind 4 / shadcn.

## Commands

```bash
pnpm build              # 전체 빌드
pnpm typecheck          # 전 패키지 tsc
pnpm test               # 계산 엔진 + 보안 단위 테스트
pnpm lint               # ESLint
pnpm smoke              # 실제 부팅 + 실제 브라우저 주요 경로 (DATABASE_URL 필요)
pnpm web                # 고객 앱 (port 3000)
pnpm admin              # 운영 앱 (port 3001)
pnpm db:seed            # 매물·시세·대출 규칙·초기 운영자 시드 (재실행 가능)
pnpm --filter @repo/database push   # prisma db push
```

**`build` → `typecheck` → `test` 는 직렬로 실행한다.** 같은 Next.js 앱의 `next build` 와 독립 `tsc` 는
`.next/types` 를 공유하므로 병렬 실행하면 TS6053 경합이 난다. 경합이 나면 소스 결함으로 확정하지 말고
build 종료를 확인한 뒤 tsc 를 한 번만 다시 돌려 판정한다.

## Structure

- **apps/web** 고객 화면 WEB-01~06 + 오버레이 2개 (Server Components 기본)
- **apps/admin** 운영 백오피스 ADM-P01~P06 · ADM-R01~R07
- **apps/email** React Email 미리보기 — **로컬 dev 전용**. 공용 `build` 는 의도적 no-op이다(사유는 `apps/email/README.md`)
- **packages/domain** 계산 엔진(순수 TS). 시세·대출 한도·격차·기간·캐릭터·우회·로드맵·공유 지문
- **packages/security** 비밀번호(scrypt)·TOTP·토큰·유출 검사. `node:crypto` 만 쓴다
- **packages/database** Prisma 스키마·클라이언트. 모든 DB 접근의 단일 출처
- **packages/design-system** shadcn/Radix 공용 UI

## 계산 불변식 (어기면 숫자가 조용히 틀린다)

- **계산은 `packages/domain` 의 순수 함수에만 둔다.** 화면·서버 액션에서 같은 식을 다시 쓰지 마라.
  두 벌이 되면 한쪽만 낡는데 결과는 여전히 «그럴듯한 숫자» 라 검수에 걸리지 않는다.
- **같은 입력 + 같은 시세·규칙 버전은 항상 같은 결과를 낸다.** 캐릭터·장비·레이드 문구 선택에 난수·
  현재 시각을 쓰지 마라(`simulate.test.ts` 가 직렬화 동치로 고정한다).
- **경계값은 테스트가 소유한다**: 12개월(여유) · 1,200개월(이번 생 불가) · 부족 자금 0 · 월 저축 0 ·
  보유 자산 0(코인 카드 계산 불가). 식을 고치면 그 테스트부터 고쳐라.
- **미입력 자격 정보를 적격으로 추정하지 마라.** 조건 위반이 있으면 부적격, 없고 미확인이 있으면 확인 필요다.
- **상호 배타 상품을 한 조합에 넣지 마라.** `exclusiveGroup` 이 같으면 가장 큰 한도 하나만 쓴다.
- **재계산 중 이전 입력과 새 시세를 섞지 마라.** 결과·로드맵·공유 지문은 `buildSimulation` 한 호출에서
  같은 입력·같은 규칙 버전으로 함께 만든다.
- **금액은 원 단위 정수다.** DB는 `BigInt`, 도메인은 `number`(상한 999,999,999,999원 < 안전 정수).
  변환은 저장소 경계(`lib/repository.ts`·`lib/admin-data.ts`)에서만 한다.

## 인증 불변식 (어기면 조용히 인증이 열린다)

인가 술어는 **`apps/admin/lib/auth/guard.ts` 하나뿐**이다. 아래는 전부 어겨도 typecheck·build·test·
화면이 그대로 통과한다 — 사람이 알아챌 신호가 없다.

- **`rejectionOf`·`isOperator` 를 다른 파일에 복제하지 마라.** 통과 판정과 «어디로 되돌릴지» 를 같은
  함수가 정하는 이유가 이것이다. 두 벌이 되면 한쪽만 낡는다.
- **`proxy.ts` 는 쿠키 존재만 본다.** 세션 유효성·MFA·역할 판정을 엣지로 옮기지 마라(Prisma를 쓸 수 없다).
  실제 관문은 `requireOperator()` 이고, 새 관리 라우트·mutation 은 예외 없이 그것을 먼저 부른다.
- **`PUBLIC_PATHS` 는 정확 일치만 쓴다.** 접두 매칭(`/login/*`)을 넣으면 보호 구역까지 함께 열린다.
  토큰이 경로에 실리는 `/reset-password/`·`/invite/` 만 `PUBLIC_PREFIXES` 로 예외다.
- **`config.matcher` 는 deny-by-default 다. 화이트리스트로 되돌리지 마라** — 새 페이지의 보호 누락이
  조용해진다. 확장자 제외는 유지한다(빼면 정적 자산이 302).
- **인가 실패를 `/login` 으로 되돌리지 마라.** 이미 로그인한 세션이 무한 왕복한다. 종착지는
  `/access-denied` 이고 **그 화면은 관문을 호출하지 않는다.**
- **미인증과 인가 실패의 응답 내용은 같다.** 사유를 구분하면 사외 사용자가 계정 존재 오라클을 얻는다.
  인증 실패 문구는 `NEUTRAL_FAILURE` 한 줄뿐이다.
- **TOTP 를 마치기 전(`mfaSatisfied === false`)에는 관리 데이터를 한 바이트도 내보내지 마라.**
- **비밀번호·TOTP 변경·계정 비활성화는 `sessionVersion` 을 올리고 관련 세션을 전부 `REVOKED` 로 만든다.**
  이 축이 있어서 JWT 가 아니라 DB 세션을 쓴다. JWT 로 «단순화» 하면 폐기가 조용히 사라진다.
- **유출 비밀번호 검사가 실패하면 통과시키지 말고 설정을 보류한다.** raw password 와 전체 해시는
  외부로 보내지 않는다(SHA-1 앞 5자만 보내는 k-anonymity).
- **`lib/auth/cookie.ts` 는 쿠키 이름 하나만 있는 모듈이다.** `session.ts` 는 `server-only`+Prisma 라
  엣지 번들에 들어갈 수 없어서 이렇게 갈랐다. 이름을 두 벌로 만들지 마라.
- **`.github/workflows/no-literal-credentials.yml` 은 `apps/admin/lib/auth/*.ts` 를 본다.**
  인증 코드를 다른 디렉터리로 옮기면 `scripts/check-admin-credentials.sh` 의 대상 글롭도 함께 옮겨라 —
  안 그러면 게이트가 «검사 대상 없음» 으로 조용히 0건이 된다.

## 데이터 · 운영 안전

- **감사 기록과 제품 변경은 한 트랜잭션이다.** `writeAudit(tx, …)` 가 트랜잭션 클라이언트를 인자로 받는
  이유가 이것이다. 감사 기록이 실패하면 제품 변경도 되돌아가야 한다.
- **시세 override·규칙 버전은 덮어쓰지 않는다.** 기존 행은 `EXPIRED` 로 두고 새 행을 만든다.
  이미 만들어진 공유 결과가 그 버전을 참조한다.
- **`ShareSnapshot.payload` 는 불변이다.** 현재 시세·규칙으로 다시 계산하지 마라(FR-024 Edge).
- **토큰 원문을 DB·로그에 남기지 마라.** 저장은 SHA-256 해시만, 원문은 URL·메일에만.
- **외부 수집(`lib/ingestion.ts`)이 실패해도 기존 유효 시세를 지우거나 0원으로 만들지 마라.**
  실패 구간의 cursor 를 보존해 같은 구간부터 재개한다.
- `DROP ... CASCADE` 대신 `RESTRICT` 를 쓴다(스키마의 관계가 이미 그렇게 선언돼 있다).

## Key Conventions

### Database Access

모든 DB 접근은 `@repo/database` 를 거친다. 직접 Prisma 클라이언트를 만들지 마라.

```typescript
import { database } from "@repo/database"; // Next RSC 전용 (server-only 가드)
import { database } from "@repo/database/node"; // plain-Node 소비자
```

- 생성된 Prisma 클라이언트는 **확장자 없는 상대 import** 를 쓴다. 번들러(Next) 나 `tsx` 없이 plain Node
  ESM 으로는 해석되지 않는다. 시드는 그래서 `tsx prisma/seed.ts` 로 돈다.
- `prisma.config.ts` 의 `DATABASE_URL` 자리표시자를 지우지 마라. `prisma generate` 는 접속하지 않는데
  env 가 없으면 그 자리에서 던져서, env 가 주입되지 않는 CI·컨테이너 빌드가 통째로 죽는다.

### 산출물 경계

이 워크트리의 루트가 곧 프로젝트 루트라 `outputs/**` 가 루트 글롭(`eslint .`·`prettier --check .`) **안**에
들어온다. 그래서 `eslint.config.mjs` 의 `ignores` 와 `.prettierignore` 양쪽에 `outputs`·`.alpha-force` 를
넣어 뒀다. **ESLint 9 flat config 는 `.eslintignore` 도 `.gitignore` 도 읽지 않으므로** 반드시
`eslint.config.mjs` 안에 있어야 한다. 새 린터·포매터를 추가하면 그 도구가 실제로 읽는 설정에도 같은 줄을 넣어라.

`docs/ref/prd` 는 `.prettierignore` 에 있다 — PRD 원문은 포매팅 대상이 아니다.

### UI

- 고객 화면은 `apps/web/app/product.css` 의 CSS 변수만 참조한다. 색·간격 리터럴을 컴포넌트에 직접 쓰지 마라.
  정본은 확정 디자인 패키지의 `tokens.json` 이다.
- 운영 화면은 `@repo/design-system` 의 shadcn 컴포넌트를 합성한다. Button/Card/Table/Badge/Input 을
  커스텀 마크업으로 다시 구현하지 마라.
- 앱 전용 토큰은 그 앱의 CSS 에 둔다. 공유 `design-system/styles/globals.css` 는 web·admin·email 을 한꺼번에 바꾼다.

### Server Actions

- `"use server"` 파일은 **async 함수만 export 할 수 있다.** 상수·타입은 별도 모듈로 뺀다
  (`apps/admin/lib/auth/form-state.ts` 가 그 이유로 존재한다).
- 백오피스 mutation 은 서버 액션 안에서 `requireOperatorOrNull()` 로 세션·MFA·역할을 **다시** 확인한다.
  클라이언트가 메뉴를 숨겼다는 것은 권한 근거가 아니다.

### 검증 규약

- **정적 검사 3종은 실행 검증을 대체하지 않는다.** 계약·화면·흐름을 바꾸면 `pnpm smoke` 를 돌려라.
- 스모크는 고정 포트를 신뢰하지 않는다. OS 배정 포트 + `/api/health` 의 `instance` 토큰 일치로
  **검증 대상 서버의 소유권**을 확인한 뒤에만 결과를 채택한다. 이 계약을 약화시키지 마라.
- 브라우저 자동화에서 클릭이 무시되면 앱 결함으로 보기 전에 대상 탭 활성화(`/json/activate`)부터 확인한다.
