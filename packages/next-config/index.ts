import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

export const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "aluket.s3.ap-northeast-2.amazonaws.com",
      },
    ],
  },
  turbopack: {},
};

export const withAnalyzer = (sourceConfig: NextConfig): NextConfig => {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    return sourceConfig; // 개발 환경에서는 그대로 리턴
  }

  return withBundleAnalyzer({
    openAnalyzer: false,
    logLevel: "silent",
  })(sourceConfig);
};
