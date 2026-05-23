import React, { createContext, useContext, useState } from "react";

type HeaderContextType = {
  activeLabel: string;
  setActiveLabel: (l: string) => void;
};

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export const ActiveHeaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeLabel, setActiveLabel] = useState<string>("Dashboard");
  return (
    <HeaderContext.Provider value={{ activeLabel, setActiveLabel }}>
      {children}
    </HeaderContext.Provider>
  );
};

export function useActiveHeader() {
  const ctx = useContext(HeaderContext);
  if (!ctx) throw new Error("useActiveHeader must be used within ActiveHeaderProvider");
  return ctx;
}

export default HeaderContext;
