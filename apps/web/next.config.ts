import path from "node:path";
import { config, withAnalyzer } from "@repo/next-config";

const nextConfig = {
  ...config,
  reactStrictMode: true,
  // Spec: 040-omniseed-docker-flavors (G8) — standalone 출력과 파일 추적 루트는 세트다.
  // 이 저장소에는 `.npmrc` 가 없어 pnpm 이 isolated symlink farm 을 만든다. 그래서
  // 컨테이너 이미지가 node_modules 를 부분 COPY 하면 dangling symlink 로 죽는다.
  // standalone 이 실제로 필요한 파일만 실서버 번들로 모아주고, outputFileTracingRoot
  // 를 모노레포 루트로 올려야 워크스페이스 패키지까지 추적된다(둘 중 하나만 켜면 누락).
  // Vercel 은 자체 파일 추적을 쓰므로 그쪽 빌드에서는 기존 동작을 그대로 둔다.
  output: process.env.VERCEL ? undefined : ("standalone" as const),
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default withAnalyzer(nextConfig);
