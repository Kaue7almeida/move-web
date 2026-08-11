"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

import type {
  FoodDiaryHistoryResponse,
  FoodDiaryTodayResponse,
  MealType,
} from "@/bff/modules/foodDiary/types";
import { getHistory, getToday } from "@/services/foodDiary/foodDiaryService";

import { useAppShell } from "../AppShellContext";
import { PageHeader, RoleGuard } from "../app-ui";
import { DiaryToday } from "./_components/DiaryToday";
import { DiaryHistory } from "./_components/DiaryHistory";
import { MealWizard } from "./_components/MealWizard";
import "./diario.css";

type DiaryView = "hoje" | "historico";

type TodayState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; today: FoodDiaryTodayResponse };

type HistoryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; history: FoodDiaryHistoryResponse };

/**
 * Diário Alimentar — experiência integrada, agora com DADOS REAIS.
 *
 * Vive dentro do AppShell autenticado do aluno. "Hoje" e "Histórico" são abas de
 * estado (sem rotas separadas). O registro de refeição é um fluxo em página (não
 * modal): quando ativo, substitui o conteúdo da aba mantendo a navegação visível.
 *
 * Toda a leitura vem do BFF (GET /api/v1/food-diary/today|history) no fuso local
 * do cliente, e toda mutação (meta, atividade, refeição) dispara um refresh do
 * dia. `todayState` é a fonte de verdade da tela "Hoje"; refreshes em segundo
 * plano preservam os dados anteriores para não piscar a tela após uma ação.
 */
export default function DiaryPage() {
  const { me } = useAppShell();
  const enabled = me.foodDiaryEnabled;

  const [todayState, setTodayState] = useState<TodayState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [historyState, setHistoryState] = useState<HistoryState>({ status: "idle" });
  const [view, setView] = useState<DiaryView>("hoje");
  const [wizardMeal, setWizardMeal] = useState<MealType | null>(null);

  // Não faz setState síncrono no corpo (o estado inicial já é "loading"); toda
  // transição acontece após o await, o que evita renders em cascata. O "loading"
  // do retry é acionado no próprio handler do botão (loadTodayFresh).
  const loadToday = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "refresh") {
      setRefreshing(true);
    }

    try {
      const today = await getToday();
      setTodayState({ status: "ready", today });
    } catch {
      // Num refresh em segundo plano, preserva o último dado bom e só mostra o
      // erro no carregamento inicial (não apaga a tela depois de uma mutação).
      setTodayState((current) => (current.status === "ready" ? current : { status: "error" }));
    } finally {
      if (mode === "refresh") {
        setRefreshing(false);
      }
    }
  }, []);

  const loadTodayFresh = useCallback(() => {
    setTodayState({ status: "loading" });
    void loadToday("initial");
  }, [loadToday]);

  const loadHistory = useCallback(async () => {
    setHistoryState({ status: "loading" });

    try {
      const history = await getHistory();
      setHistoryState({ status: "ready", history });
    } catch {
      setHistoryState({ status: "error" });
    }
  }, []);

  // Carregamento inicial: setState só nos callbacks da promise (não no corpo do
  // efeito), com guarda de unmount — evita render em cascata e state após sair.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;

    getToday()
      .then((today) => {
        if (active) {
          setTodayState({ status: "ready", today });
        }
      })
      .catch(() => {
        if (active) {
          setTodayState((current) => (current.status === "ready" ? current : { status: "error" }));
        }
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  const refreshToday = useCallback(() => {
    void loadToday("refresh");
  }, [loadToday]);

  const openHistory = useCallback(() => {
    setView("historico");
    // Recarrega ao abrir a aba para refletir confirmações recentes do dia.
    void loadHistory();
  }, [loadHistory]);

  // Beta gate: o Diário só é acessível para alunos com a feature habilitada
  // (FOOD_DIARY_BETA_EMAILS). A fronteira de segurança real é o guard da API;
  // isto apenas bloqueia a página visual para as demais contas.
  if (!enabled) {
    return (
      <RoleGuard
        title="Diário Alimentar"
        description="O Diário Alimentar faz parte do espaço do aluno no Move."
      />
    );
  }

  /* ─── Fluxo de registro (wizard em página) ─── */

  if (wizardMeal !== null) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Registrar refeição"
          description="Fotografe o prato — a IA estima, você confirma."
        />
        <MealWizard
          initialMealType={wizardMeal}
          onSaved={refreshToday}
          onExit={() => setWizardMeal(null)}
        />
      </div>
    );
  }

  const hasTarget = todayState.status === "ready" && todayState.today.target !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diário Alimentar"
        description="Seu balanço calórico do dia, refeição a refeição."
      />

      {/* Abas: Hoje / Histórico */}
      <div
        className="flex rounded-xl border border-border bg-surface p-1 text-sm font-semibold"
        role="tablist"
        aria-label="Visões do diário"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === "hoje"}
          onClick={() => setView("hoje")}
          className={[
            "flex-1 rounded-lg px-4 py-2 transition-colors",
            view === "hoje" ? "bg-accent text-accent-on" : "text-muted hover:text-foreground",
          ].join(" ")}
        >
          Hoje
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "historico"}
          disabled={!hasTarget}
          onClick={openHistory}
          title={hasTarget ? undefined : "Defina sua meta para liberar o histórico"}
          className={[
            "flex-1 rounded-lg px-4 py-2 transition-colors",
            view === "historico" ? "bg-accent text-accent-on" : "text-muted hover:text-foreground",
            hasTarget ? "" : "cursor-not-allowed opacity-40",
          ].join(" ")}
        >
          Histórico
        </button>
      </div>

      {view === "hoje" ? (
        <TodayPanel
          state={todayState}
          refreshing={refreshing}
          onRetry={loadTodayFresh}
          onStartMeal={setWizardMeal}
          onRefresh={refreshToday}
        />
      ) : (
        <HistoryPanel state={historyState} onRetry={() => void loadHistory()} />
      )}
    </div>
  );
}

/* ─── Painel "Hoje" ──────────────────────────────────────────────────────────── */

function TodayPanel({
  state,
  refreshing,
  onRetry,
  onStartMeal,
  onRefresh,
}: {
  state: TodayState;
  refreshing: boolean;
  onRetry: () => void;
  onStartMeal: (meal: MealType) => void;
  onRefresh: () => void;
}) {
  if (state.status === "loading") {
    return <LoadingCard label="Carregando seu diário de hoje..." />;
  }

  if (state.status === "error") {
    return (
      <ErrorCard
        message="Não foi possível carregar o diário de hoje."
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="relative">
      {refreshing && (
        <div
          className="pointer-events-none absolute right-0 top-0 z-10 flex items-center gap-1.5 text-[11px] font-medium text-muted"
          aria-live="polite"
        >
          <Loader2 size={13} className="animate-spin" />
          Atualizando…
        </div>
      )}
      <DiaryToday today={state.today} onStartMeal={onStartMeal} onRefresh={onRefresh} />
    </div>
  );
}

/* ─── Painel "Histórico" ─────────────────────────────────────────────────────── */

function HistoryPanel({ state, onRetry }: { state: HistoryState; onRetry: () => void }) {
  if (state.status === "loading" || state.status === "idle") {
    return <LoadingCard label="Carregando seu histórico..." />;
  }

  if (state.status === "error") {
    return <ErrorCard message="Não foi possível carregar o histórico." onRetry={onRetry} />;
  }

  return <DiaryHistory days={state.history.days} />;
}

/* ─── Estados compartilhados ─────────────────────────────────────────────────── */

function LoadingCard({ label }: { label: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2.5 rounded-2xl border border-border bg-surface p-10 text-sm text-muted"
      aria-live="polite"
    >
      <Loader2 size={18} className="animate-spin text-accent" />
      {label}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-muted text-accent">
        <AlertCircle size={24} strokeWidth={1.8} />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{message}</p>
        <p className="mt-1 text-xs text-muted">Verifique sua conexão e tente novamente.</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
      >
        <RefreshCw size={15} />
        Tentar de novo
      </button>
    </div>
  );
}
