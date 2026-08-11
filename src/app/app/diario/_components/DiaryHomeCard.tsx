"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Camera, Sparkles, Target } from "lucide-react";

import type { FoodDiaryTodayResponse } from "@/bff/modules/foodDiary/types";
import { getToday } from "@/services/foodDiary/foodDiaryService";

import { BalanceRing } from "./BalanceRing";

/**
 * Bloco do Diário Alimentar na Home do aluno — HERO secundário. Agora usa dados
 * REAIS do dia (GET /api/v1/food-diary/today) com fuso local do cliente.
 *
 * Fallback seguro: enquanto carrega, ou se a chamada falhar, cai no convite neutro
 * (nunca quebra a Home, nunca mostra número falso). Só é renderizado quando o beta
 * está habilitado (a Home decide isso via me.foodDiaryEnabled).
 */
type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; today: FoodDiaryTodayResponse };

export function DiaryHomeCard() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    getToday()
      .then((today) => {
        if (isMounted) {
          setState({ status: "ready", today });
        }
      })
      .catch(() => {
        if (isMounted) {
          setState({ status: "error" });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Loading / error → convite neutro (fallback seguro, sem dados falsos).
  if (state.status !== "ready") {
    return (
      <InviteCard
        icon="sparkles"
        subtitle="Registre suas refeições por foto e acompanhe seu balanço calórico do dia."
      />
    );
  }

  const { today } = state;

  // Sem meta definida (primeiro uso).
  if (!today.target) {
    return (
      <InviteCard
        icon="target"
        subtitle="Configure sua meta calórica e comece a registrar suas refeições por foto."
      />
    );
  }

  const targetKcal = today.target.targetKcal;
  const consumed = today.totals.consumedKcal;
  const burned = today.totals.burnedKcal;
  const remaining = today.totals.remainingKcal ?? targetKcal + burned - consumed;
  const isOver = remaining < 0;
  const hasMeals = today.meals.length > 0;

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
          consumedKcal={consumed}
          targetKcal={targetKcal}
          burnedKcal={burned}
          burnReferenceKcal={Math.max(burned, 1)}
          variant="compact"
        />

        <div className="min-w-0 flex-1">
          {hasMeals ? (
            <>
              <p className="text-sm font-semibold text-foreground">
                {isOver ? "Você passou da meta de hoje" : "Ainda cabe no seu dia"}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {consumed.toLocaleString("pt-BR")} de {targetKcal.toLocaleString("pt-BR")} kcal ·{" "}
                {today.meals.length} {today.meals.length > 1 ? "refeições" : "refeição"}
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

function InviteCard({
  icon,
  subtitle,
}: {
  icon: "target" | "sparkles";
  subtitle: string;
}) {
  return (
    <Link
      href="/app/diario"
      className="card-themed group flex items-center gap-4 rounded-2xl border border-accent/30 bg-surface p-5 ring-1 ring-accent/10 transition-colors hover:bg-surface-hover"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-on">
        {icon === "target" ? <Target size={24} strokeWidth={1.8} /> : <Sparkles size={24} strokeWidth={1.8} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-foreground">Diário Alimentar</p>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">Novo</span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{subtitle}</p>
      </div>
      <ArrowRight size={18} className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
