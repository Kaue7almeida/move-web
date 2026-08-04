"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Camera, Sparkles, Target } from "lucide-react";

import type { DiaryDay } from "../_mock/diaryMock";
import { createSeededDay, dayBurned, dayConsumed } from "../_mock/diaryMock";
import { BalanceRing } from "./BalanceRing";

/**
 * Bloco do Diário Alimentar na Home do aluno — HERO secundário (ao lado do
 * treino do dia). Indicador compacto + saldo enxuto + CTA para /app/diario.
 *
 * FASE MOCK: por padrão renderiza o estado semeado determinístico (meta definida
 * + refeições → saldo disponível). O componente também cobre "sem meta" e "sem
 * refeição", mas a demonstração usa sempre o mesmo estado.
 */
export function DiaryHomeCard({ day }: { day?: DiaryDay }) {
  const state = useMemo(() => day ?? createSeededDay(), [day]);
  const consumed = dayConsumed(state);
  const burned = dayBurned(state);

  // Estado 1 — sem meta definida (primeiro uso).
  if (state.targetKcal === null) {
    return (
      <Link
        href="/app/diario"
        className="card-themed group flex items-center gap-4 rounded-2xl border border-accent/30 bg-surface p-5 ring-1 ring-accent/10 transition-colors hover:bg-surface-hover"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-on">
          <Target size={24} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">Diário Alimentar</p>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">Novo</span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Configure sua meta calórica e comece a registrar suas refeições por foto.
          </p>
        </div>
        <ArrowRight size={18} className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
      </Link>
    );
  }

  const targetKcal = state.targetKcal;
  const remaining = targetKcal + burned - consumed.kcal;
  const isOver = remaining < 0;
  const hasMeals = state.meals.length > 0;

  return (
    <Link
      href="/app/diario"
      className="card-themed dia-rise group block rounded-2xl border border-accent/30 bg-surface p-5 ring-1 ring-accent/10 transition-colors hover:bg-surface-hover"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Diário Alimentar</p>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">Novo</span>
        </div>
        <ArrowRight size={16} className="text-accent transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="mt-4 flex items-center gap-5">
        <BalanceRing
          consumedKcal={consumed.kcal}
          targetKcal={targetKcal}
          burnedKcal={burned}
          burnReferenceKcal={Math.max(state.estimatedDailyBurn, 1)}
          variant="compact"
        />

        <div className="min-w-0 flex-1">
          {hasMeals ? (
            <>
              <p className="text-sm font-semibold text-foreground">
                {isOver ? "Você passou da meta de hoje" : "Ainda cabe no seu dia"}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {consumed.kcal.toLocaleString("pt-BR")} de {targetKcal.toLocaleString("pt-BR")} kcal ·{" "}
                {state.meals.length} {state.meals.length > 1 ? "refeições" : "refeição"}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">Meta definida</p>
              <p className="mt-0.5 text-xs text-muted">
                Registre sua primeira refeição para começar o dia.
              </p>
            </>
          )}

          <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-bold text-accent-on transition-colors group-hover:bg-accent-hover">
            {hasMeals ? <Sparkles size={14} /> : <Camera size={14} />}
            {hasMeals ? "Abrir Diário" : "Registrar refeição"}
          </span>
        </div>
      </div>
    </Link>
  );
}
