import { AnalyticsProvider } from "@repo/analytics";
import { AppProvider } from "@repo/design-system/providers/AppProvider";
import type { ThemeProviderProps } from "next-themes";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./providers/theme";
import "./styles/globals.css";

type DesignSystemProviderProperties = ThemeProviderProps;

export const DesignSystemProvider = ({
  children,
  ...properties
}: DesignSystemProviderProperties) => (
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
    {...properties}
  >
    <AnalyticsProvider>
      <AppProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </AppProvider>
    </AnalyticsProvider>
  </ThemeProvider>
);
