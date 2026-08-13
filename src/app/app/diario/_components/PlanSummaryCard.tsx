"use client";

import { HelpCircle, Pencil } from "lucide-react";

import { ROUTINE_SHORT_LABELS } from "../_content";
import { formatKcal } from "../_content";
import type { FoodDiaryHud, FoodDiaryPlanView } from "@/bff/modules/foodDiary/types/plan";

/**
 * Resumo compacto do plano no rodapé de "Hoje" — objetivo, metabolismo, rotina e
 * faixa, sem "saldo planejado" na cara. Dois caminhos: entender (abre a explicação)
 * e ajustar (abre o wizard). Mantém a página leve: detalhe sob demanda.
 */
export function PlanSummaryCard({
  plan,
  hud,
  onExplain,
  onAdjust,
}: {
  plan: FoodDiaryPlanView;
  hud: FoodDiaryHud;
  onExplain: () => void;
  onAdjust: () => void;
}) {
  const tmbSourceLabel =
    plan.tmbSource === "scan" ? "MoveScan" : plan.tmbSource === "body_fat" ? "% de gordura" : "manual";

  return (
    <section className="dia-rise rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold text-foreground">Seu plano</h2>
        <button
          type="button"
          onClick={onAdjust}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-strong px-3 py-1.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-surface-hover"
        >
          <Pencil size={13} className="text-muted" />
          Ajustar
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        <Row label="Objetivo" value={plan.goalLabel} />
        <Row label="Rotina" value={ROUTINE_SHORT_LABELS[plan.routineLevel]} />
        <Row label="Metabolismo" value={`${formatKcal(plan.tmbKcal)} kcal`} hint={`via ${tmbSourceLabel}`} />
        <Row label="Faixa de hoje" value={`${formatKcal(hud.bandLowKcal)}–${formatKcal(hud.bandHighKcal)}`} hint="kcal" />
      </dl>

      <button
        type="button"
        onClick={onExplain}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background/40 px-4 py-3 text-[14px] font-semibold text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
      >
        <HelpCircle size={16} className="text-accent" />
        Entender meu plano
      </button>
    </section>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-bold leading-tight text-foreground">
        {value}
        {hint && <span className="ml-1 text-[12px] font-medium text-muted">{hint}</span>}
      </dd>
    </div>
  );
}
