"use client";

import { createContext, useContext, useEffect, useState } from "react";

type AppContextType = {
  isMobile: boolean;
  mounted: boolean;
};

const AppContext = createContext<AppContextType>({
  isMobile: false,
  mounted: false,
});

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const breakpoint = "768px";
    const mql = window.matchMedia(`(max-width: ${breakpoint})`);
    const onChane = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    setIsMobile(mql.matches);
    mql.addEventListener("change", onChane);
    setMounted(true);

    return () => {
      mql.removeEventListener("change", onChane);
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        isMobile: isMobile ?? true,
        mounted: mounted,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within a AppContextProvider");
  }

  return context;
};
