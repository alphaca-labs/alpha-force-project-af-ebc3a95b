# apps/email — React Email 미리보기

`emails/` 의 템플릿을 브라우저에서 확인하는 **로컬 개발 도구**다. 배포 대상이 아니고,
제품 런타임에서 메일을 보내는 것은 `@repo/email`(Resend) 이다.

## 왜 `build` 가 no-op 인가

`email build` 는 `react-email` 이 자기 미리보기 앱(`@react-email/preview-server`)을 통째로
`next build` 하는 명령이다. 그 앱은 `framer-motion` → `motion-dom` 의 export 불일치로
`Attempted import error: 'activeAnimations' is not exported from 'motion-dom'` 를 내며 실패한다.
이 저장소의 소스와 무관한 **상류 의존성 조합** 문제이고, bootstrap 커밋
`bd9bf29125e4f319f1d560b96199a5d507aafb59` 에서도 같은 오류로 실패한다(2026-09-09 실측).

미리보기 서버 하나 때문에 `pnpm build` 전체가 빨간불이면 진짜 회귀가 그 밑에 숨는다.
그래서 공용 `build` 는 no-op 으로 두고, 미리보기 번들이 정말 필요할 때만 아래를 직접 부른다.

```bash
pnpm --filter email dev            # 템플릿 미리보기 (권장)
pnpm --filter email build:preview  # 상류 이슈가 풀린 뒤에만 성공한다
```

상류가 고쳐지면 `build` 를 `email build` 로 되돌리고 이 문단을 지운다.
