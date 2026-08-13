"use client";

import { ArrowDown, Dumbbell, Flame, Footprints, Sigma, Target } from "lucide-react";

import type { FoodDiaryHud, FoodDiaryPlanView } from "@/bff/modules/foodDiary/types/plan";

import { formatKcal } from "../_content";

/**
 * "Como calculamos sua faixa?" — conta a matemática do motor energético em passos
 * humanos, com os VALORES REAIS do dia (não recalcula nada; só lê o HUD/plano).
 * É aqui que déficit/superávit vive — fora da superfície principal. Feito para
 * caber num BottomSheet, com fonte confortável no mobile (≥14px no corpo).
 */
export function PlanExplainer({ hud, plan }: { hud: FoodDiaryHud; plan: FoodDiaryPlanView | null }) {
  const balance = hud.plannedBalanceKcal;
  const balanceLabel =
    balance < 0 ? "Déficit planejado" : balance > 0 ? "Superávit planejado" : "Manutenção";
  const balanceHint =
    balance < 0
      ? "um pouco abaixo do gasto, para perder gordura"
      : balance > 0
        ? "um pouco acima do gasto, para ganhar massa"
        : "no mesmo nível do gasto do dia";

  return (
    <div className="space-y-3">
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        Sua faixa-alvo não é um número mágico — ela vem da sua energia do dia, passo a passo:
      </p>

      <ol className="space-y-2.5">
        <Step
          icon={Flame}
          label="Metabolismo basal (TMB)"
          hint={tmbSourceHint(plan)}
          value={`${formatKcal(hud.tmbKcal)} kcal`}
        />
        <Operator symbol="×" text={`rotina fora dos treinos (fator ${hud.routineFactor})`} icon={Footprints} />
        <Step icon={Sigma} label="Gasto base" hint="o que seu corpo gasta num dia comum" value={`${formatKcal(hud.gastoBaseKcal)} kcal`} strong />
        <Operator
          symbol="+"
          text={hud.burnedKcal > 0 ? `atividades de hoje (+${formatKcal(hud.burnedKcal)} kcal)` : "atividades de hoje (nenhuma ainda)"}
          icon={Dumbbell}
        />
        <Step icon={Sigma} label="Gasto de hoje" hint="gasto base + o que você se mexeu hoje" value={`${formatKcal(hud.gastoDiaKcal)} kcal`} strong />
        <Operator symbol={balance < 0 ? "−" : balance > 0 ? "+" : "="} text={`${balanceLabel} — ${balanceHint}`} icon={ArrowDown} signedValue={balance} />
        <Step icon={Target} label="Alvo central do dia" hint="o centro da sua faixa" value={`${formatKcal(hud.alvoCentralKcal)} kcal`} strong />
      </ol>

      <div className="rounded-2xl border border-success/30 bg-success-soft/40 p-4">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-success">Sua faixa de hoje</p>
        <p className="mt-1 font-display text-2xl font-bold text-foreground">
          {formatKcal(hud.bandLowKcal)}–{formatKcal(hud.bandHighKcal)}
          <span className="ml-1.5 text-sm font-medium text-muted">kcal</span>
        </p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
          Ficar dentro dessa faixa é seguir seu objetivo hoje. É uma estimativa que se ajusta conforme
          você registra refeições e atividades — não uma prescrição.
        </p>
      </div>
    </div>
  );
}

function tmbSourceHint(plan: FoodDiaryPlanView | null): string {
  if (!plan) {
    return "energia que seu corpo gasta em repouso";
  }

  switch (plan.tmbSource) {
    case "scan":
      return "da sua massa magra no MoveScan";
    case "body_fat":
      return "estimada do seu % de gordura";
    default:
      return "informada por você";
  }
}

function Step({
  icon: Icon,
  label,
  hint,
  value,
  strong,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  hint: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <li
      className={[
        "flex items-center gap-3 rounded-xl border p-3",
        strong ? "border-border bg-surface-strong/50" : "border-border bg-surface",
      ].join(" ")}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-muted text-accent">
        <Icon size={17} strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold text-foreground">{label}</p>
        <p className="text-[13px] leading-snug text-muted">{hint}</p>
      </div>
      <span className="shrink-0 font-display text-base font-bold tabular-nums text-foreground">{value}</span>
    </li>
  );
}

function Operator({
  symbol,
  text,
  icon: Icon,
  signedValue,
}: {
  symbol: string;
  text: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  signedValue?: number;
}) {
  return (
    <li className="flex items-center gap-3 px-3">
      <span className="flex h-6 w-9 shrink-0 items-center justify-center font-display text-lg font-bold text-muted">
        {symbol}
      </span>
      <span className="flex items-center gap-1.5 text-[13px] leading-snug text-muted-foreground">
        <Icon size={14} className="shrink-0 text-muted" />
        {text}
        {signedValue !== undefined && signedValue !== 0 && (
          <span className="font-semibold text-foreground">
            {signedValue > 0 ? "+" : ""}
            {formatKcal(signedValue)} kcal
          </span>
        )}
      </span>
    </li>
  );
}
