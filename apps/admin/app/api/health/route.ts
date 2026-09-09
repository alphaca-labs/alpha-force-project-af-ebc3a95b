// 배포 헬스 프로브 대상 경로. env·DB 를 참조하지 않는다 — 미리보기 컨테이너에는 env 가
// 1건도 주입되지 않으므로, 여기서 데이터베이스를 읽으면 앱은 멀쩡한데 배포만 실패한다.
// 리다이렉트도 금지(프로브는 3xx 를 실패로 본다) — `proxy.ts` 의 PUBLIC_PATHS 에 있는 이유다.
//
// `instance` 의 의미는 apps/web 의 같은 라우트와 같다: 응답한 프로세스 식별자.
export function GET() {
  return Response.json({
    service: "admin",
    status: "ok",
    instance: process.env.APP_INSTANCE_ID ?? null,
  });
}
