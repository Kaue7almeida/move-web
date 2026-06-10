"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Smartphone } from "lucide-react";

/**
 * Card discreto de "adicionar a tela inicial" exibido em /entrar.
 *
 * Progressive enhancement, sem service worker:
 * - Android/Chromium: usa o prompt nativo quando `beforeinstallprompt`
 *   disparar; caso contrario, instrucao manual pelo menu do navegador.
 * - iOS/Safari: nao existe prompt programatico — sempre instrucao manual
 *   via Compartilhar > Adicionar a Tela de Inicio.
 * - Standalone (ja aberto pelo icone): estado discreto de confirmacao.
 * - Desktop/outros: oculto.
 */

/** Evento nao tipado pelo DOM lib (spec ainda incubada nos Chromium). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type Environment = "standalone" | "ios" | "android" | "other";

function detectEnvironment(): Environment {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  if (isStandalone) {
    return "standalone";
  }

  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS se identifica como Mac, mas e o unico "Mac" com tela de toque.
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

  if (isIos) {
    return "ios";
  }

  if (/Android/i.test(ua)) {
    return "android";
  }

  return "other";
}

/** Reage a mudanca de display-mode (ex.: aberto pelo icone depois de instalado). */
function subscribeToDisplayMode(onChange: () => void) {
  const mediaQuery = window.matchMedia("(display-mode: standalone)");
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getServerEnvironment(): Environment | null {
  return null;
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 flex items-start gap-3.5 rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f26a1b]/12 text-[#f26a1b]">
        <Smartphone size={15} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function AddToHomeCard() {
  const environment = useSyncExternalStore<Environment | null>(
    subscribeToDisplayMode,
    detectEnvironment,
    getServerEnvironment,
  );
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (!installPrompt) {
      return;
    }

    // O prompt so pode ser usado uma vez; depois cai no fallback manual.
    setInstallPrompt(null);
    await installPrompt.prompt();

    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
  }

  // Antes da deteccao (SSR/primeiro paint) e em desktop/outros: nada.
  if (environment === null || environment === "other") {
    return null;
  }

  if (environment === "standalone") {
    return (
      <p className="mt-5 text-center text-[0.78rem] leading-5 text-white/35">
        Você já está usando o Move pelo ícone da tela inicial.
      </p>
    );
  }

  if (isInstalled) {
    return (
      <CardShell>
        <p className="text-[0.85rem] font-semibold text-white/85">Pronto!</p>
        <p className="mt-1 text-[0.8rem] leading-5 text-white/50">
          O Move foi adicionado. Da próxima vez, abra direto pelo ícone na tela inicial.
        </p>
      </CardShell>
    );
  }

  return (
    <CardShell>
      <p className="text-[0.85rem] font-semibold text-white/85">Adicione à tela inicial</p>
      {environment === "ios" ? (
        <p className="mt-1 text-[0.8rem] leading-5 text-white/50">
          No Safari, toque em Compartilhar e escolha &ldquo;Adicionar à Tela de Início&rdquo;.
          Depois, acesse mais rápido pelo ícone.
        </p>
      ) : installPrompt ? (
        <>
          <p className="mt-1 text-[0.8rem] leading-5 text-white/50">
            Acesse mais rápido pelo ícone, sem abrir o navegador.
          </p>
          <button
            type="button"
            onClick={handleInstallClick}
            className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-[#f26a1b]/40 bg-[#f26a1b]/10 px-4 text-[0.8rem] font-semibold text-[#f26a1b] transition hover:bg-[#f26a1b]/18"
          >
            Adicionar à tela inicial
          </button>
        </>
      ) : (
        <p className="mt-1 text-[0.8rem] leading-5 text-white/50">
          No menu do navegador, escolha &ldquo;Adicionar à tela inicial&rdquo;. Depois, acesse
          mais rápido pelo ícone.
        </p>
      )}
    </CardShell>
  );
}
