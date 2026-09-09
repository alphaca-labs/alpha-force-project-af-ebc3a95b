// Spec: 040-omniseed-docker-flavors (G5/AC8)
//
// ⚠️ 이 파일은 **존재한다는 사실만으로 배포 헬스 프로브의 대상 경로를 바꾼다.**
// 컨테이너 배포 플랫폼은 헬스 경로를 Next.js 관례 경로 목록으로 자동추론하는데
// `app/api/health/route.ts` 가 그 목록에 있다. 즉 이 파일이 있으면 프로브 대상이
// `/` → `/api/health` 로 전환되고, **경로를 옮기거나 지우면 조용히 `/` 로 되돌아간다.**
// 이름·위치를 바꿀 때는 그 사실을 알고 바꿔야 한다.
//
// 그래서 무-DB 여야 한다: 실제로 배포 성패를 가르는 엔드포인트이고, 미리보기
// 컨테이너에는 env 가 1건도 주입되지 않는다. 데이터베이스·외부 서비스를 참조하는
// 순간 앱은 멀쩡한데 배포만 실패하는 상태가 만들어진다.
// 리다이렉트도 금지 — 프로브가 `redirect:"manual"` + `response.ok` 라 3xx 는 실패다.
export function GET() {
  return Response.json({ service: "web", status: "ok" });
}
