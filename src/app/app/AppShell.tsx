"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Home,
  Users,
  Dumbbell,
  FolderOpen,
  Activity,
  User,
  LogOut,
  Menu,
  MessageCircle,
  X,
  ClipboardList,
  BarChart3,
  Shield,
  ScanLine,
} from "lucide-react";

import type { MeResponse } from "@/bff/modules/profile/types";
import {
  UnauthenticatedRequestError,
  authenticatedFetch,
  readApiErrorMessage,
} from "@/services/api/authenticatedFetch";
import { getSupabaseBrowserClient } from "@/services/auth/supabaseClient";

import { AppShellProvider } from "./AppShellContext";
import { NotificationsBell } from "./NotificationsBell";
import { ThemeProvider } from "./ThemeContext";
import { buildNavigation, getFirstName, isOnboardingStep } from "./app-utils";

type NavIconName =
  | "home"
  | "users"
  | "dumbbell"
  | "folder"
  | "activity"
  | "user"
  | "clipboard"
  | "chart"
  | "shield"
  | "scan"
  | "chat";

const NAV_ICONS: Record<string, NavIconName> = {
  "/app": "home",
  "/app/alunos": "users",
  "/app/treinos": "dumbbell",
  "/app/galeria": "folder",
  "/app/acompanhamento": "activity",
  "/app/perfil": "user",
  "/app/historico": "chart",
  "/app/admin": "shield",
  "/app/scan": "scan",
  "/app/chat": "chat",
};

function NavIcon({ name, size = 20 }: { name: NavIconName; size?: number }) {
  const props = { size, strokeWidth: 1.8 };

  switch (name) {
    case "home":
      return <Home {...props} />;
    case "users":
      return <Users {...props} />;
    case "dumbbell":
      return <Dumbbell {...props} />;
    case "folder":
      return <FolderOpen {...props} />;
    case "activity":
      return <Activity {...props} />;
    case "user":
      return <User {...props} />;
    case "clipboard":
      return <ClipboardList {...props} />;
    case "chart":
      return <BarChart3 {...props} />;
    case "shield":
      return <Shield {...props} />;
    case "scan":
      return <ScanLine {...props} />;
    case "chat":
      return <MessageCircle {...props} />;
  }
}

/* ─── Loading skeleton ─── */
function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-sm text-muted">Carregando...</p>
      </div>
    </div>
  );
}

/* ─── Error state ─── */
function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-sm text-red-500">{message}</p>
      </div>
    </div>
  );
}

/* ─── Desktop sidebar ─── */
function DesktopSidebar({
  navigation,
  pathname,
  isTrainer,
  displayName,
  email,
  onSignOut,
  isSigningOut,
}: {
  navigation: Array<{ href: string; label: string }>;
  pathname: string;
  isTrainer: boolean;
  displayName: string | null;
  email: string | undefined;
  onSignOut: () => void;
  isSigningOut: boolean;
}) {
  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-border bg-surface lg:flex">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <span className="text-sm font-bold text-accent-on">M</span>
          </div>
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            Move
          </span>
        </div>
        <NotificationsBell />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const iconName = NAV_ICONS[item.href] ?? "home";

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent-soft text-accent"
                      : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                  ].join(" ")}
                >
                  <NavIcon name={iconName} size={18} />
                  {item.label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-strong text-xs font-semibold text-muted-foreground">
            {(displayName ?? email ?? "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {displayName ?? "Meu perfil"}
            </p>
            <p className="truncate text-xs text-muted">
              {isTrainer ? "Personal" : "Aluno"}
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            disabled={isSigningOut}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
            title="Sair"
          >
            <LogOut size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ─── Mobile header ─── */
function MobileHeader({
  isMobileMenuOpen,
  onToggleMenu,
}: {
  isMobileMenuOpen: boolean;
  onToggleMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm lg:hidden">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent">
          <span className="text-xs font-bold text-accent-on">M</span>
        </div>
        <span className="font-display text-base font-semibold tracking-tight text-foreground">
          Move
        </span>
      </div>
      <div className="flex items-center gap-1">
        <NotificationsBell />
        <button
          type="button"
          onClick={onToggleMenu}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}

/* ─── Mobile bottom navigation ─── */
function MobileBottomNav({
  navigation,
  pathname,
}: {
  navigation: Array<{ href: string; label: string }>;
  pathname: string;
}) {
  // Show max 5 items in bottom nav
  const bottomItems = navigation.slice(0, 5);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
      <ul className="flex items-center justify-around px-1">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          const iconName = NAV_ICONS[item.href] ?? "home";

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={[
                  "flex flex-col items-center gap-1 px-1 py-2.5 text-center transition-colors",
                  isActive ? "text-accent" : "text-muted",
                ].join(" ")}
              >
                <NavIcon name={iconName} size={20} />
                <span className="text-[10px] font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ─── Mobile overlay menu (for items beyond 5 + sign out) ─── */
function MobileOverlayMenu({
  isOpen,
  onClose,
  navigation,
  pathname,
  displayName,
  email,
  isTrainer,
  onSignOut,
  isSigningOut,
}: {
  isOpen: boolean;
  onClose: () => void;
  navigation: Array<{ href: string; label: string }>;
  pathname: string;
  displayName: string | null;
  email: string | undefined;
  isTrainer: boolean;
  onSignOut: () => void;
  isSigningOut: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-[280px] border-l border-border bg-background p-4">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm font-medium text-foreground">Menu</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const iconName = NAV_ICONS[item.href] ?? "home";

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent-soft text-accent"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                ].join(" ")}
              >
                <NavIcon name={iconName} size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-border pt-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-strong text-xs font-semibold text-muted-foreground">
              {(displayName ?? email ?? "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {displayName ?? "Meu perfil"}
              </p>
              <p className="truncate text-xs text-muted">
                {isTrainer ? "Personal" : "Aluno"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            disabled={isSigningOut}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
          >
            <LogOut size={18} strokeWidth={1.8} />
            {isSigningOut ? "Saindo..." : "Sair da conta"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main AppShell ─── */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getSupabaseBrowserClient();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    let isMounted = true;

    async function loadMe() {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.access_token) {
        router.replace("/entrar");
        return;
      }

      try {
        const response = await authenticatedFetch("/api/v1/me", {
          accessToken: data.session.access_token,
          method: "GET",
        });

        if (response.status === 401) {
          await supabase.auth.signOut();
          router.replace("/entrar");
          return;
        }

        if (!response.ok) {
          const message = await readApiErrorMessage(
            response,
            "Algo deu errado ao carregar seus dados.",
          );

          if (isMounted) {
            setErrorMessage(message);
            setIsLoading(false);
          }

          return;
        }

        const payload = (await response.json()) as MeResponse;

        if (isOnboardingStep(payload.nextStep)) {
          router.replace("/onboarding");
          return;
        }

        if (isMounted) {
          setMe(payload);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (error instanceof UnauthenticatedRequestError) {
          router.replace("/entrar");
          return;
        }

        if (isMounted) {
          setErrorMessage("Algo deu errado ao carregar seus dados.");
          setIsLoading(false);
        }
      }
    }

    void loadMe();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  async function handleSignOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/entrar");
  }

  const refreshMe = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/api/v1/me", { method: "GET" });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as MeResponse;
      setMe(payload);
    } catch {
      // Non-critical background refresh — keep the cached profile on failure.
    }
  }, []);

  if (isLoading) {
    return <LoadingState />;
  }

  if (errorMessage || !me) {
    return <ErrorState message={errorMessage ?? "Algo deu errado ao carregar seus dados."} />;
  }

  const isTrainer = me.primaryRole === "trainer";
  const navigation = buildNavigation(me.primaryRole, me.isAdmin);
  const displayName = me.profile?.full_name ?? null;
  const greetingName = getFirstName(
    displayName,
    me.user.email,
    isTrainer ? "personal" : "aluno",
  );

  return (
    <ThemeProvider>
      <AppShellProvider
        value={{
          me,
          setMe: (nextMe) => setMe(nextMe),
          refreshMe,
          greetingName,
          displayName,
          isTrainer,
          navigation,
        }}
      >
        <div className="min-h-screen bg-background">
          {/* Desktop sidebar */}
          <DesktopSidebar
            navigation={navigation}
            pathname={pathname}
            isTrainer={isTrainer}
            displayName={displayName}
            email={me.user.email}
            onSignOut={handleSignOut}
            isSigningOut={isSigningOut}
          />

          {/* Mobile header */}
          <MobileHeader
            isMobileMenuOpen={isMobileMenuOpen}
            onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />

          {/* Mobile overlay menu */}
          <MobileOverlayMenu
            isOpen={isMobileMenuOpen}
            onClose={closeMobileMenu}
            navigation={navigation}
            pathname={pathname}
            displayName={displayName}
            email={me.user.email}
            isTrainer={isTrainer}
            onSignOut={handleSignOut}
            isSigningOut={isSigningOut}
          />

          {/* Mobile bottom navigation */}
          <MobileBottomNav navigation={navigation} pathname={pathname} />

          {/* Main content */}
          <main className="lg:ml-[240px]">
            <div className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
              {children}
            </div>
          </main>
        </div>
      </AppShellProvider>
    </ThemeProvider>
  );
}
