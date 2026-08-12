"use client";

import { Activity, ArrowDownRight, ArrowUpRight, Check, Flame, Sparkles, Target } from "lucide-react";

import type { FoodDiaryTodayResponse } from "@/bff/modules/foodDiary/types";
import type { FoodDiaryHud } from "@/bff/modules/foodDiary/types/plan";

import { formatKcal } from "../_content";
import { macroTargetsForKcal } from "../_nutrition";

/**
 * HUD do dia — a resposta central "estou seguindo meu objetivo hoje?". Consome
 * today.hud (calculado pelo motor energético no BFF). A atividade NÃO é mostrada
 * como "ganhei calorias para comer": ela ajusta o gasto e desloca a faixa,
 * mantendo o mesmo objetivo.
 */
export function DiaryHud({ today, hud }: { today: FoodDiaryTodayResponse; hud: FoodDiaryHud }) {
  const statusTone =
    hud.status === "within" ? "success" : hud.status === "above" ? "accent" : "muted";

  const scaleMax = Math.max(hud.bandHighKcal * 1.15, hud.consumedKcal * 1.1, 1);
  const bandLeft = (hud.bandLowKcal / scaleMax) * 100;
  const bandWidth = ((hud.bandHighKcal - hud.bandLowKcal) / scaleMax) * 100;
  const consumedLeft = Math.min((hud.consumedKcal / scaleMax) * 100, 100);

  const headlineValue = hud.status === "above" ? hud.kcalOverBandTop : hud.kcalToBandTop;
  const headlineLabel = hud.status === "above" ? "kcal acima do topo da faixa" : "kcal até o topo da faixa";

  const tips = buildNextMoves(today, hud);

  return (
    <section className="dia-rise space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      {/* Missão + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
            <Flame size={13} strokeWidth={2.4} />
            {hud.missionLabel}
          </p>
          <p className="mt-1 text-lg font-bold leading-tight text-foreground">{hud.statusLabel}</p>
        </div>
        <StatusPill tone={statusTone} status={hud.status} />
      </div>

      {/* Número central */}
      <div>
        <p className="font-display text-4xl font-bold tracking-tight text-foreground">
          {formatKcal(headlineValue)}
          <span className="ml-2 text-sm font-medium text-muted">{headlineLabel}</span>
        </p>
      </div>

      {/* Faixa */}
      <div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-strong">
          <div
            className="absolute inset-y-0 rounded-full bg-success/30"
            style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
            aria-hidden="true"
          />
          <div
            className={[
              "absolute inset-y-0 w-1 rounded-full",
              hud.status === "within" ? "bg-success" : "bg-accent",
            ].join(" ")}
            style={{ left: `calc(${consumedLeft}% - 2px)` }}
            aria-hidden="true"
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] font-medium text-muted">
          <span>faixa {formatKcal(hud.bandLowKcal)}</span>
          <span>alvo {formatKcal(hud.alvoCentralKcal)}</span>
          <span>{formatKcal(hud.bandHighKcal)}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <HudStat icon={Flame} tone="accent" label="Consumido" value={hud.consumedKcal} />
        <HudStat icon={Activity} tone="success" label="Gasto estimado" value={hud.gastoDiaKcal} />
        <HudStat
          icon={Target}
          tone="neutral"
          label="Saldo planejado"
          value={hud.plannedBalanceKcal}
          signed
        />
      </div>

      {today.activities.length > 0 && (
        <p className="flex gap-2 rounded-xl border border-border bg-background/40 p-3 text-[11px] leading-relaxed text-muted">
          <Activity size={13} className="mt-0.5 shrink-0 text-success" />
          Sua atividade aumentou o gasto estimado de hoje e ajustou sua faixa — mantendo o mesmo objetivo.
        </p>
      )}

      {/* Próximo movimento */}
      {tips.length > 0 && (
        <div className="rounded-2xl border border-accent/25 bg-accent-muted/30 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent">
            <Sparkles size={13} /> Próximo movimento
          </p>
          <ul className="mt-2 space-y-1.5">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gamificação leve (honesta, sem incentivar déficit extremo) */}
      <div className="flex flex-wrap gap-2">
        {today.meals.length > 0 && (
          <Badge icon={Check} label={`${today.meals.length} refeição${today.meals.length > 1 ? "ões" : ""} hoje`} />
        )}
        {hud.status === "within" && <Badge icon={Target} label="Dentro da faixa" tone="success" />}
        {today.activities.length > 0 && <Badge icon={Activity} label="Dia com atividade" tone="success" />}
      </div>
    </section>
  );
}

/* ─── Próximo movimento (regras determinísticas, sem IA, não médicas) ─── */

function buildNextMoves(today: FoodDiaryTodayResponse, hud: FoodDiaryHud): string[] {
  const tips: string[] = [];
  const macroTargets = macroTargetsForKcal(hud.alvoCentralKcal);
  const proteinGap = Math.round(macroTargets.proteinG - today.totals.consumedProteinG);

  if (hud.status === "below" && hud.kcalToBandTop > 0) {
    tips.push(
      hud.goal === "gain"
        ? `Ganho de massa pede energia: ainda cabem ${formatKcal(hud.kcalToBandTop)} kcal na sua faixa.`
        : `Faltam ${formatKcal(hud.kcalToBandTop)} kcal para o topo da sua faixa.`,
    );
  }

  if (proteinGap > 15 && today.meals.length > 0) {
    tips.push(`Faltam ~${proteinGap}g de proteína para o alvo do dia.`);
  }

  if (hud.status === "above") {
    tips.push("Você passou do topo hoje — um dia mais leve amanhã reequilibra a semana.");
  }

  if (today.meals.length === 0) {
    tips.push("Registre sua primeira refeição para acompanhar seu dia.");
  }

  return tips.slice(0, 3);
}

/* ─── bits ─── */

function StatusPill({ tone, status }: { tone: "success" | "accent" | "muted"; status: string }) {
  const label = status === "within" ? "Dentro" : status === "above" ? "Acima" : "Abaixo";
  const Icon = status === "above" ? ArrowUpRight : status === "below" ? ArrowDownRight : Check;
  const toneClass =
    tone === "success"
      ? "bg-success-soft text-success"
      : tone === "accent"
        ? "bg-accent-soft text-accent"
        : "bg-surface-strong text-muted-foreground";

  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass}`}>
      <Icon size={13} />
      {label}
    </span>
  );
}

function HudStat({
  icon: Icon,
  tone,
  label,
  value,
  signed,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  tone: "accent" | "success" | "neutral";
  label: string;
  value: number;
  signed?: boolean;
}) {
  const toneClass =
    tone === "accent"
      ? "text-accent bg-accent-muted"
      : tone === "success"
        ? "text-success bg-success-soft"
        : "text-muted-foreground bg-surface-strong";

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon size={14} strokeWidth={1.8} />
      </div>
      <p className="mt-2 font-display text-lg font-bold tracking-tight text-foreground">
        {signed && value > 0 ? "+" : ""}
        {value.toLocaleString("pt-BR")}
        <span className="ml-1 text-[10px] font-medium text-muted">kcal</span>
      </p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}

function Badge({
  icon: Icon,
  label,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  tone?: "neutral" | "success";
}) {
  const toneClass = tone === "success" ? "border-success/40 bg-success-soft text-success" : "border-border bg-surface text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${toneClass}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}
