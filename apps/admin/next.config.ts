import { config, withAnalyzer } from "@repo/next-config";

const nextConfig = {
  ...config,
  reactStrictMode: true,
};

export default withAnalyzer(nextConfig);
