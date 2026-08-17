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
import { AskAiAboutDay } from "./_components/AskAiAboutDay";
import { BottomSheet } from "./_components/BottomSheet";
import { DiaryHud } from "./_components/DiaryHud";
import { DiaryToday } from "./_components/DiaryToday";
import { DiaryHistory } from "./_components/DiaryHistory";
import { MealWizard } from "./_components/MealWizard";
import { NextMove } from "./_components/NextMove";
import { PlanExplainer } from "./_components/PlanExplainer";
import { PlanOnboarding } from "./_components/PlanOnboarding";
import { PlanSummaryCard } from "./_components/PlanSummaryCard";
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
 * Vive dentro do AppShell autenticado do usuário. "Hoje" e "Histórico" são abas de
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

  // Acesso ao Diário: feature pessoal, disponível para qualquer papel autenticado
  // (GA). A fronteira de segurança real é o guard da API; isto apenas reflete o
  // me.foodDiaryEnabled resolvido no servidor (aberto a todos, salvo restrição
  // emergencial via FOOD_DIARY_RESTRICT_EMAILS).
  if (!enabled) {
    return (
      <RoleGuard
        title="Diário Alimentar"
        description="O Diário Alimentar não está disponível no seu acesso no momento."
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

  // Histórico depende do PLANO 2.0 (não da meta legada).
  const hasPlan = todayState.status === "ready" && todayState.today.plan !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diário Alimentar"
        description="Acompanhe seu objetivo de hoje — refeições e atividades."
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
          disabled={!hasPlan}
          onClick={openHistory}
          title={hasPlan ? undefined : "Defina seu plano para liberar o histórico"}
          className={[
            "flex-1 rounded-lg px-4 py-2 transition-colors",
            view === "historico" ? "bg-accent text-accent-on" : "text-muted hover:text-foreground",
            hasPlan ? "" : "cursor-not-allowed opacity-40",
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
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);

  if (state.status === "loading") {
    return <LoadingCard label="Carregando seu diário de hoje..." />;
  }

  if (state.status === "error") {
    return <ErrorCard message="Não foi possível carregar o diário de hoje." onRetry={onRetry} />;
  }

  const today = state.today;

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

      {today.plan !== null && today.hud !== null ? (
        <div className="dia-stagger space-y-6">
          {/* Hierarquia: Missão/HUD → Próximo movimento → Conversar com a IA → Registrar/... → Plano */}
          <DiaryHud hud={today.hud} onExplain={() => setExplainOpen(true)} />

          <NextMove today={today} hud={today.hud} />

          <AskAiAboutDay />

          <DiaryToday today={today} onStartMeal={onStartMeal} onRefresh={onRefresh} hud={today.hud} />

          <PlanSummaryCard
            plan={today.plan}
            hud={today.hud}
            onExplain={() => setExplainOpen(true)}
            onAdjust={() => setPlanSheetOpen(true)}
          />

          <BottomSheet open={explainOpen} onClose={() => setExplainOpen(false)} title="Como calculamos sua faixa?">
            <PlanExplainer hud={today.hud} plan={today.plan} />
          </BottomSheet>

          <BottomSheet open={planSheetOpen} onClose={() => setPlanSheetOpen(false)} title="Meu plano">
            <PlanOnboarding
              onSaved={() => {
                setPlanSheetOpen(false);
                onRefresh();
              }}
            />
          </BottomSheet>
        </div>
      ) : (
        // Primeiro uso do Diário 2.0: monta o plano (substitui a config simples).
        <PlanOnboarding onSaved={onRefresh} />
      )}
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
