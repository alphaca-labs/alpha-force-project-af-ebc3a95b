import { DesignSystemProvider } from "@repo/design-system";
import { pretendard } from "@repo/design-system/lib/fonts";
import "./styles.css";
import { cn } from "@repo/design-system/lib/utils";
import { createMetadata } from "@repo/seo/metadata";
import type { ReactNode } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

type RootLayoutProperties = {
  readonly children: ReactNode;
};

export const metadata = createMetadata({
  title: "Title",
  description: "Description",
});

const RootLayout = ({ children }: RootLayoutProperties) => (
  <html
    lang="en"
    className={cn(pretendard.className, "scroll-smooth")}
    suppressHydrationWarning
  >
    <body>
      <DesignSystemProvider>
        <div className={"flex flex-col"}>
          <Header />
          {children}
          <Footer />
        </div>
      </DesignSystemProvider>
    </body>
  </html>
);

export default RootLayout;
