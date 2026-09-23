import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSensorStream, type SensorStream } from "../hooks/useSensorStream";
import type { Tab, Theme, Unit } from "../lib/types";

interface AppContextValue {
  tab: Tab;
  setTab: (t: Tab) => void;
  unit: Unit;
  setUnit: (u: Unit) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  sensor: SensorStream;
}

const AppContext = createContext<AppContextValue | null>(null);

function readLS<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>("home");
  const [unit, setUnitState] = useState<Unit>(() => readLS("nova.unit", "C"));
  const [theme, setThemeState] = useState<Theme>(() => readLS("nova.theme", "dark"));
  const sensor = useSensorStream();

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const value = useMemo<AppContextValue>(
    () => ({
      tab,
      setTab,
      unit,
      setUnit: (u) => {
        setUnitState(u);
        try { localStorage.setItem("nova.unit", u); } catch { /* private mode */ }
      },
      theme,
      setTheme: (t) => {
        setThemeState(t);
        try { localStorage.setItem("nova.theme", t); } catch { /* private mode */ }
      },
      sensor,
    }),
    [tab, unit, theme, sensor]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
