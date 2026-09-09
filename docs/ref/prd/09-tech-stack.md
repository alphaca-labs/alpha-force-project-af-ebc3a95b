<!-- prd/09-tech-stack.md · 뭐해야집사냐? · v1 -->
# 기술 스택 및 아키텍처 (고정)

> 이 파일의 역할: 확정된 기술 스택·초기화 절차·앱 배치·컨벤션이다. 이 파일의 결정은 변경하지 않는다.

> 본 프로젝트는 사내 표준 템플릿 **omniseed** 를 `pnpm bootstrap` 로 초기화해 구축한다.
> 아래 스택·구조·컨벤션은 결정 사항이다. 다른 프레임워크·ORM·UI 라이브러리를 도입하지 않으며,
> 세부 규칙의 SSOT 는 초기화된 저장소의 CLAUDE.md 다.

### 초기화 절차
```bash
git clone https://github.com/alphaca-labs/omniseed.git {프로젝트slug} && cd {프로젝트slug}
pnpm install
pnpm bootstrap          # flavor 프루닝 (파괴적 — 실행 후 스크립트 자기 제거)
# packages/database/.env 에 DATABASE_URL 설정 (PostgreSQL)
pnpm migrate                 # prisma format + generate + db push
pnpm dev
```

### 스택
| 영역 | 기술 |
|------|------|
| 모노레포 | Turborepo + pnpm (Node ≥24) |
| 프론트/서버 | Next.js 16 App Router (Server Components 기본) + React 19 |
| DB | PostgreSQL + Prisma 7 — `packages/database` 단일 접근 |
| UI | Tailwind CSS 4 + shadcn/ui (`@repo/design-system`, 모노크롬 테마) |
| 폼/검증 | react-hook-form + zod |
| 클라 상태 | TanStack Query |
| 인증 | NextAuth v5 (admin 기구성 — web 에 필요 시 동일 패턴 미러) |
| 업로드 | `@repo/upload` (R2 presigned) — 파일 기능이 `04-functional-requirements.md` 에 있을 때만 |
| 이메일 | `apps/email` React Email — 메일 발송이 `08-non-functional.md` 에 있을 때만 |

### 앱 배치 (PRD ↔ 코드 매핑)
| PRD | 구현 위치 |
|-----|-----------|
| `05-screens.md` 고객용 화면 전부 | `apps/web` (port 3000) |
| `05-screens.md` 관리자용 화면 전부 | `apps/admin` (port 3001, NextAuth 로그인) |
| `06-data-model.md` ERD | `packages/database/prisma/schema.prisma` (전 모델·컬럼 한글 주석) |
| `07-api-and-permissions.md` 동작 전부 | 서버 액션 `@actions/{domain}/{action}.ts` (`'use server'`) — 외부 공개 API 필요 항목만 route handler |

### 필수 컨벤션 (요약 — SSOT 는 저장소 CLAUDE.md)
- DB 접근은 `@repo/database` 만: RSC = `'@repo/database'` / 그 외 서버 코드 = `'@repo/database/node'`. 직접 PrismaClient 생성 금지.
- UI 는 `@repo/design-system` 컴포넌트 조합 — 재구현 금지, `className`(tailwind-merge) 으로 튜닝.
- 모든 외부 입력은 서버에서 zod 재검증. 권한은 `07-api-and-permissions.md` 매트릭스를 서버 가드로 강제(클라 숨김만으로 대체 금지).
- 디렉터리 kebab-case · 스코프별 `_components`/`_hooks`/`lib`.
- 아이콘 lucide-react(web) / Material Symbols(admin) · 토스트 sonner.