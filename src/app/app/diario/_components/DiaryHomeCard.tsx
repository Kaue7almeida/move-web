"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Camera, Flame, Sparkles, Target } from "lucide-react";

import type { FoodDiaryTodayResponse } from "@/bff/modules/foodDiary/types";
import { getToday } from "@/services/foodDiary/foodDiaryService";

/**
 * Bloco do Diário Alimentar na Home do usuário — HERO secundário. Usa o PLANO 2.0
 * e o HUD (motor planEnergy), NÃO a fórmula/meta legada. Só é renderizado quando o
 * beta está habilitado (a Home decide via me.foodDiaryEnabled).
 *
 * Fallback seguro: enquanto carrega, ou se falhar, cai no convite neutro (nunca
 * quebra a Home, nunca mostra número falso).
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

  if (state.status !== "ready") {
    return (
      <InviteCard
        icon="sparkles"
        subtitle="Registre suas refeições por foto e acompanhe seu objetivo do dia."
      />
    );
  }

  const { today } = state;

  // Sem plano (primeiro uso) → convite para configurar o plano.
  if (today.plan === null || today.hud === null) {
    return (
      <InviteCard
        icon="target"
        subtitle="Defina seu plano (objetivo + gasto) e acompanhe se está no caminho hoje."
      />
    );
  }

  const hud = today.hud;
  const isAbove = hud.status === "above";
  const headlineValue = isAbove ? hud.kcalOverBandTop : hud.kcalToBandTop;
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

      <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent">
        <Flame size={12} strokeWidth={2.4} />
        {hud.missionLabel}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{hud.statusLabel}</p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight text-foreground">
            {headlineValue.toLocaleString("pt-BR")}
          </p>
          <p className="text-[11px] text-muted">
            {isAbove ? "kcal acima do topo da faixa" : "kcal até o topo da faixa"}
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-bold text-accent-on transition-colors group-hover:bg-accent-hover">
          {hasMeals ? <Sparkles size={14} /> : <Camera size={14} />}
          {hasMeals ? "Abrir Diário" : "Registrar"}
        </span>
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
