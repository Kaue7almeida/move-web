"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Camera, Flame, Sparkles, Target } from "lucide-react";

import type { FoodDiaryTodayResponse } from "@/bff/modules/foodDiary/types";
import { getToday } from "@/services/foodDiary/foodDiaryService";

import { formatKcal } from "../_content";
import { homeHeadline } from "./diaryHomeHeadline";

/**
 * Bloco do Diário Alimentar na Home. Duas variantes:
 *  • "spotlight" → protagonista do ALUNO beta (logo após o Greeting);
 *  • "default"   → hero secundário (Home do trainer, posição atual).
 *
 * Usa o PLANO 2.0 + HUD (motor planEnergy) e a MESMA regra de manchete do HUD 2.1
 * (below = quanto falta para ENTRAR na faixa — nunca kcalToBandTop). Fallback seguro:
 * enquanto carrega/erro, cai no convite neutro (nunca quebra a Home, nunca número falso).
 */
type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; today: FoodDiaryTodayResponse };

type Variant = "default" | "spotlight";

export function DiaryHomeCard({ variant = "default" }: { variant?: Variant }) {
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

  const spotlight = variant === "spotlight";

  if (state.status !== "ready") {
    return (
      <InviteCard
        variant={variant}
        icon="sparkles"
        subtitle="Registre suas refeições e atividades e acompanhe seu objetivo do dia."
      />
    );
  }

  const { today } = state;

  // Sem plano (primeiro uso) → convite para montar o plano.
  if (today.plan === null || today.hud === null) {
    return (
      <InviteCard
        variant={variant}
        icon="target"
        subtitle={spotlight ? "Monte seu plano em 3 passos e acompanhe seu objetivo do dia." : "Defina seu plano (objetivo + gasto) e acompanhe se está no caminho hoje."}
        cta={spotlight ? "Começar" : undefined}
      />
    );
  }

  const hud = today.hud;
  const head = homeHeadline(hud);
  const hasMeals = today.meals.length > 0;

  return (
    <Link
      href="/app/diario"
      className={[
        "card-themed dia-rise group block rounded-2xl border bg-surface transition-colors hover:bg-surface-hover",
        spotlight ? "border-accent/40 p-6 ring-1 ring-accent/15" : "border-accent/30 p-5 ring-1 ring-accent/10",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent">Diário Alimentar</p>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">Novo</span>
        </div>
        <ArrowRight size={spotlight ? 18 : 16} className="text-accent transition-transform group-hover:translate-x-0.5" />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-accent">
        <Flame size={13} strokeWidth={2.4} />
        {hud.missionLabel}
      </p>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {head.kind === "within" ? (
            <p className={spotlight ? "font-display text-[22px] font-bold text-foreground" : "text-[15px] font-bold text-foreground"}>
              {head.label}
            </p>
          ) : (
            <>
              <p
                className={[
                  "font-display font-bold tracking-tight text-foreground",
                  spotlight ? "text-4xl" : "text-2xl",
                ].join(" ")}
              >
                {formatKcal(head.value ?? 0)}
              </p>
              <p className="mt-0.5 text-[13px] text-muted">{head.label}</p>
            </>
          )}
        </div>

        <span
          className={[
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent font-bold text-accent-on transition-colors group-hover:bg-accent-hover",
            spotlight ? "px-4 py-2.5 text-sm" : "px-3.5 py-2 text-xs",
          ].join(" ")}
        >
          {hasMeals ? <Sparkles size={spotlight ? 16 : 14} /> : <Camera size={spotlight ? 16 : 14} />}
          {hasMeals ? "Abrir Diário" : "Registrar"}
        </span>
      </div>
    </Link>
  );
}

function InviteCard({
  variant,
  icon,
  subtitle,
  cta,
}: {
  variant: Variant;
  icon: "target" | "sparkles";
  subtitle: string;
  cta?: string;
}) {
  const spotlight = variant === "spotlight";

  return (
    <Link
      href="/app/diario"
      className={[
        "card-themed group block rounded-2xl border bg-surface transition-colors hover:bg-surface-hover",
        spotlight ? "border-accent/40 p-6 ring-1 ring-accent/15" : "border-accent/30 p-5 ring-1 ring-accent/10",
      ].join(" ")}
    >
      <div className="flex items-center gap-4">
        <div className={["flex shrink-0 items-center justify-center rounded-xl bg-accent text-accent-on", spotlight ? "h-14 w-14" : "h-12 w-12"].join(" ")}>
          {icon === "target" ? <Target size={spotlight ? 26 : 24} strokeWidth={1.8} /> : <Sparkles size={spotlight ? 26 : 24} strokeWidth={1.8} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={spotlight ? "text-[16px] font-bold text-foreground" : "text-sm font-bold text-foreground"}>Diário Alimentar</p>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">Novo</span>
          </div>
          <p className={["leading-relaxed text-muted", spotlight ? "mt-1 text-[14px]" : "mt-0.5 text-[13px]"].join(" ")}>{subtitle}</p>
        </div>
        {!cta && <ArrowRight size={18} className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />}
      </div>

      {cta && (
        <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-on transition-colors group-hover:bg-accent-hover">
          {cta}
          <ArrowRight size={16} />
        </span>
      )}
    </Link>
  );
}
