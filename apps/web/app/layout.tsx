import { DesignSystemProvider } from "@repo/design-system";
import { pretendard } from "@repo/design-system/lib/fonts";
import "./styles.css";
import "./product.css";
import { cn } from "@repo/design-system/lib/utils";
import { createMetadata } from "@repo/seo/metadata";
import type { ReactNode } from "react";

export const metadata = createMetadata({
  title: "뭐해야집사냐?",
  description:
    "원하는 집과 지금의 재정 조건을 넣으면 자금 격차·예상 기간·실행 로드맵을 계산합니다. 로그인 없이 바로 씁니다.",
});

const RootLayout = ({ children }: { readonly children: ReactNode }) => (
  <html
    lang="ko"
    className={cn(pretendard.variable, pretendard.className, "scroll-smooth")}
    suppressHydrationWarning
  >
    <body>
      <a className="skip-link" href="#main-content">
        본문으로 이동
      </a>
      <DesignSystemProvider>{children}</DesignSystemProvider>
    </body>
  </html>
);

export default RootLayout;
