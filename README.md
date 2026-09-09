# 뭐해야집사냐?

원하는 집과 지금의 재정 조건을 넣으면 **자금 격차·예상 기간·실행 로드맵**을 계산해 주는 서비스입니다.
회원가입 없이 쓰고, 결과는 픽셀 캐릭터가 붙은 세로형 이미지와 추측 불가능한 공유 링크로 남길 수 있습니다.

요구사항 정본은 `docs/ref/prd/` 의 PRD 10개 문서(FR-001~037, FLOW-001~005)입니다. 문서와 코드가
어긋나면 PRD가 우선입니다.

## 무엇을 하는가

**고객(비로그인)**

1. `/` 목표 집을 고른다 — 추천 최대 8개, 2자 이상 검색 최대 20개, 평형별 대표 시세
2. `/finance` 보유 자산·연소득·월 저축·기존 대출을 원 단위로 넣는다
3. `/result` 부족 자금·달성률·예상 기간·캐릭터·절망 지수·우회 카드 4종을 본다.
   같은 화면에서 월 저축·연소득·평형을 바꾸면 다시 계산한다
4. `/roadmap` 상품별 적격·부적격·확인 필요 판정과 조달 조합, 5단계 미션을 받는다
5. `/checklist` 주간·월간 미션을 브라우저에 저장하며 실행한다
6. `/share/[token]` 생성 당시 결과를 그대로 보존한 링크를 공유한다

**운영자(이메일 + TOTP 2단계 인증)**

- `/properties` 매물·면적별 시세 상태 · `/properties/[id]/areas/[id]` 확정 시세 편집과 이력
- `/rules` 대출 규칙 버전 · `/rules/[id]` 새 버전 작성(기존 버전 불변, 기간 충돌 차단)
- `/admins` 초대·역할·비활성화 · `/audit-logs` 변경 이력(읽기 전용)

## 계산 계약 (요약)

- 대표 시세: 취소되지 않은 거래의 **최근 6개월 중위가격** → 없으면 12개월 → 그래도 없으면 `시세 확인 불가`.
  유효기간 안의 운영자 확정 시세가 자동값보다 우선한다.
- 예상 대출 한도: `min(담보가치×LTV, DSR 잔여 상환여력의 원금 환산, 상품 최대 한도)`.
  상호 배타 상품은 가장 큰 하나만, 병행 가능한 상품만 합산한다.
- 부족 자금 `max(시세 − 자산 − 대출, 0)` · 달성률 `min((자산+대출)/시세×100, 100)` (소수 첫째 자리)
- 예상 기간 `ceil(부족 자금 / 월 저축)` — 0원은 즉시 가능, 월 저축 0원은 계산 불가, 1,200개월 이상은 `100년 이상`
- 캐릭터: 12개월 이하 여유 / 초과~1,200개월 미만 영끌 노력 / 1,200개월 이상·계산 불가 이번 생 불가
- 취득세·중개보수·이사비, 집값 상승, 저축 이자, 투자 수익은 계산에서 빼고 화면에 명시한다.

전부 `packages/domain` 의 순수 함수이고 `packages/domain/src/simulate.test.ts` 42건이 경계값까지 고정한다.

## 구조

```
apps/web      고객 화면 (Next.js 16 App Router, 포트 3000)
apps/admin    운영 백오피스 (Next.js 16, DB 세션 + TOTP, 포트 3001)
apps/email    React Email 미리보기 (로컬 dev 전용 — apps/email/README.md 참조)
packages/domain     계산 엔진 (시세·대출·격차·로드맵·공유 지문) — 순수 TS
packages/security   비밀번호(scrypt)·TOTP·토큰·유출 검사 — node:crypto 만 사용
packages/database   Prisma 스키마와 클라이언트 (모든 DB 접근의 단일 출처)
packages/design-system  shadcn/Radix 기반 공용 UI
scripts/smoke.mjs   실제 프로세스 부팅 + 실제 브라우저 주요 경로 스모크
docs/ref/prd/       PRD 원문 (바이트 변경 금지)
```

## 시작하기

```bash
corepack enable
pnpm install

# 데이터베이스
export DATABASE_URL="postgresql://user:password@localhost:5432/zipsanya"
pnpm --filter @repo/database build   # prisma generate
pnpm --filter @repo/database push    # prisma db push
pnpm db:seed                         # 매물·시세·대출 규칙·초기 운영자

# 실행
pnpm web      # http://localhost:3000
pnpm admin    # http://localhost:3001
```

`apps/admin` 은 `AUTH_ENCRYPTION_KEY`(16자 이상)가 반드시 필요합니다. TOTP secret 저장 암호화 키이고,
값이 바뀌면 기존 secret 을 복호화할 수 없습니다. 초대·재설정 메일은 `RESEND_TOKEN` 이 있을 때만 발송하고,
없으면 **발송하지 않되 «보냈다»고 표시하지도 않습니다.**

시드가 만든 초기 운영자는 `SETUP_REQUIRED` 상태입니다. 첫 로그인에서 비밀번호를 새로 정하고 인증 앱을
등록해야 운영 화면이 열립니다(`SEED_ADMIN_EMAIL`·`SEED_ADMIN_PASSWORD` 로 바꿀 수 있습니다).

## 검증

```bash
pnpm build       # 전체 빌드
pnpm typecheck   # 전 패키지 tsc
pnpm test        # 계산 엔진 42건 + 보안 12건
pnpm lint        # ESLint
pnpm smoke       # 실제 부팅 + 실제 브라우저 주요 경로 37건
```

`pnpm smoke` 는 `DATABASE_URL`·`AUTH_ENCRYPTION_KEY` 가 필요하고, 시드된 DB를 씁니다.
고정 포트를 신뢰하지 않고 OS가 배정한 포트를 쓰며, `/api/health` 응답의 `instance` 가 이번 실행이 주입한
토큰과 **바이트 단위로 같을 때만** 준비 완료로 인정합니다(다른 서버의 200을 오인하지 않기 위해서입니다).
검사 뒤 초기 운영자 상태를 되돌리므로 연속 재실행이 됩니다.

`pnpm build → pnpm typecheck → pnpm test` 는 **직렬로** 돌리세요. 같은 Next.js 앱의 build 와 tsc 는
`.next/types` 를 공유해 병렬 실행하면 TS6053 경합이 납니다.

## 지키는 것

- 고객에게서 성명·주민등록번호·증빙 파일·금융기관 인증정보를 받지 않습니다. 공유·이미지·로그에도 넣지 않습니다.
- 공유 토큰과 인증 토큰은 난수이고 DB에는 SHA-256 해시만 저장합니다. 없는 토큰과 만료된 토큰은 같은 응답입니다.
- 운영자 인증 실패는 이메일·비밀번호·TOTP 중 무엇이 틀렸는지도, 계정이 있는지도 구분하지 않습니다.
- 시세·규칙의 과거 적용 이력은 덮어쓰거나 지우지 않습니다. 변경과 감사 기록은 한 트랜잭션입니다.
- 이미 만들어진 공유 결과는 현재 시세·규칙이 바뀌어도 재계산하지 않습니다.
- 계산 결과는 정보 제공 목적이며 대출 승인·매입 가능을 보장하지 않습니다.

## 라이선스

MIT
