import { baseUrl } from "lib/utils";
import type { MetadataRoute } from "next";

// Spec: 040-omniseed-docker-flavors (G7/FR-005) — 정적 라우트 목록.
// 이전 구현은 라우트 디렉토리를 런타임에 동기 스캔해서 목록을 만들었다. standalone
// 컨테이너 이미지에는 앱 소스가 들어있지 않으므로 그 스캔은 실행 시점에 throw 하고
// /sitemap.xml 이 500 이 된다. 헬스 프로브는 `/` 만 보기 때문에 배포는 GREEN 인 채로
// 사이트맵만 조용히 깨진다. 라우트를 추가하면 이 배열에 함께 추가한다.
// 공유 결과(/share/[token])는 추측 불가능한 토큰이 관문이므로 사이트맵에 넣지 않는다.
const ROUTES = ["", "/finance", "/result", "/roadmap", "/checklist"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date().toISOString();

  return ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
  }));
}
