"use client";

import { createContext, useContext } from "react";

import type { MeResponse } from "@/bff/modules/profile/types";

import type { AppNavigationItem } from "./app-utils";

type AppShellContextValue = {
  me: MeResponse;
  setMe: (nextMe: MeResponse) => void;
  /** Refetches /api/v1/me and updates the shared state. Stable identity. */
  refreshMe: () => Promise<void>;
  greetingName: string;
  displayName: string | null;
  isTrainer: boolean;
  navigation: AppNavigationItem[];
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({
  value,
  children,
}: {
  value: AppShellContextValue;
  children: React.ReactNode;
}) {
  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const context = useContext(AppShellContext);

  if (!context) {
    throw new Error("useAppShell must be used within AppShellProvider.");
  }

  return context;
}