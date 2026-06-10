"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "move-theme";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/* ─── External store for theme ─── */

let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

function getServerSnapshot(): ThemeMode {
  return "dark";
}

function setThemeValue(mode: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  document.documentElement.setAttribute("data-theme", mode);
  emitChange();
}

/* ─── Provider ─── */

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeValue(mode);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
