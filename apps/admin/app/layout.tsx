import { DesignSystemProvider } from "@repo/design-system";
import { pretendard, robotoMono } from "@repo/design-system/lib/fonts";
import { cn } from "@repo/design-system/lib/utils";
import "./styles.css";
import { auth } from "@/auth";
import Providers from "@/providers/provider";
import type { ReactNode } from "react";

type RootLayoutProperties = {
  readonly children: ReactNode;
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: RootLayoutProperties) {
  const session = await auth();

  return (
    <html
      lang="ko"
      className={cn(pretendard.className, robotoMono.variable)}
      suppressHydrationWarning
    >
      <head>
        {/* Material Symbols Outlined icon webfont. App Router의 <head> link가 올바르며,
            display=block은 ligature 이름이 텍스트로 깜빡이는 것을 막는 Material Symbols 권장값.
            아래 @next/next 폰트 규칙은 pages router 대상이라 여기선 오탐. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body>
        <Providers session={session}>
          <DesignSystemProvider forcedTheme="light" enableSystem={false}>
            {children}
          </DesignSystemProvider>
        </Providers>
      </body>
    </html>
  );
}
