"use client";

import { useState } from "react";

import type { ActivityEntry, BurnMode, DiaryDay, DiaryMeal, MealType } from "./_mock/diaryMock";
import {
  buildHistory,
  createSeededDay,
  dayBurned,
  dayConsumed,
  nextId,
} from "./_mock/diaryMock";
import { useAppShell } from "../AppShellContext";
import { PageHeader, RoleGuard } from "../app-ui";
import { DiaryToday } from "./_components/DiaryToday";
import { DiaryHistory } from "./_components/DiaryHistory";
import { MealWizard } from "./_components/MealWizard";
import "./diario.css";

type DiaryView = "hoje" | "historico";

/**
 * Diário Alimentar — experiência integrada (FASE VISUAL/MOCKADA).
 *
 * Vive dentro do AppShell autenticado do aluno. "Hoje" e "Histórico" são abas de
 * estado (sem rotas separadas nesta fase). O registro de refeição é um fluxo em
 * página (não modal): quando ativo, substitui o conteúdo da aba, mantendo a
 * navegação do MoveX Fit visível.
 *
 * Todo o estado é mockado e determinístico (ver _mock/diaryMock.ts): sem rede,
 * sem Supabase, sem IA, sem localStorage. Alterações vivem só na sessão.
 */
export default function DiaryPage() {
  const { me } = useAppShell();

  const [day, setDay] = useState<DiaryDay>(() => createSeededDay());
  const [view, setView] = useState<DiaryView>("hoje");
  const [wizardMeal, setWizardMeal] = useState<MealType | null>(null);

  if (!me.isStudent) {
    return (
      <RoleGuard
        title="Diário Alimentar"
        description="O Diário Alimentar faz parte do espaço do aluno no Move."
      />
    );
  }

  const hasTarget = day.targetKcal !== null;

  /* ─── Mutações de estado (em memória, só na sessão) ─── */

  function setTarget(kcal: number) {
    setDay((current) => ({ ...current, targetKcal: Math.round(kcal) }));
  }

  function addMeal(meal: DiaryMeal) {
    setDay((current) => ({ ...current, meals: [...current.meals, meal] }));
  }

  function removeMeal(mealId: string) {
    setDay((current) => ({ ...current, meals: current.meals.filter((meal) => meal.id !== mealId) }));
  }

  function addActivity(label: string, kcal: number) {
    const activity: ActivityEntry = { id: nextId("act"), label, kcal };
    setDay((current) => ({ ...current, activities: [...current.activities, activity] }));
  }

  function removeActivity(activityId: string) {
    setDay((current) => ({
      ...current,
      activities: current.activities.filter((activity) => activity.id !== activityId),
    }));
  }

  function setBurnMode(mode: BurnMode) {
    setDay((current) => ({ ...current, burnMode: mode }));
  }

  function setEstimatedBurn(kcal: number) {
    setDay((current) => ({ ...current, estimatedDailyBurn: kcal }));
  }

  /* ─── Wizard ─── */

  if (wizardMeal !== null) {
    return (
      <div className="space-y-6">
        <PageHeader title="Registrar refeição" description="Fotografe o prato — a IA estima, você confirma." />
        <MealWizard
          initialMealType={wizardMeal}
          mealOrdinal={day.meals.length + 1}
          onConfirm={(meal) => {
            addMeal(meal);
            // O passo "done" fica no wizard; ao fechar, volta para o Diário.
          }}
          onCancel={() => setWizardMeal(null)}
        />
      </div>
    );
  }

  const consumed = dayConsumed(day);
  const history = buildHistory({
    consumedKcal: consumed.kcal,
    burnedKcal: dayBurned(day),
    targetKcal: day.targetKcal ?? 2200,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Diário Alimentar" description="Seu balanço calórico do dia, refeição a refeição." />

      {/* Abas: Hoje / Histórico */}
      <div className="flex rounded-xl border border-border bg-surface p-1 text-sm font-semibold" role="tablist">
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
          onClick={() => setView("historico")}
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
        <DiaryToday
          day={day}
          onStartMeal={setWizardMeal}
          onRemoveMeal={removeMeal}
          onSetTarget={setTarget}
          onAddActivity={addActivity}
          onRemoveActivity={removeActivity}
          onSetBurnMode={setBurnMode}
          onSetEstimatedBurn={setEstimatedBurn}
        />
      ) : (
        <DiaryHistory history={history} />
      )}
    </div>
  );
}
