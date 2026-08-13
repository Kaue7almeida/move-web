"use client";

import { ArrowDownRight, ArrowUpRight, Check, Flame, HelpCircle, Target, Zap } from "lucide-react";

import type { FoodDiaryHud } from "@/bff/modules/foodDiary/types/plan";

import { formatKcal } from "../_content";

function clampPct(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

/** Keep the "Você" callout pill from overflowing the gauge edges on mobile. */
function markerAnchor(pct: number): number {
  return Math.min(88, Math.max(12, pct));
}

/**
 * HUD do dia — a resposta central "estou seguindo meu objetivo hoje?".
 *
 * Redesenhado (2.1) para ser autoexplicativo em segundos:
 *  • headline que muda com o estado (falta entrar / dentro / acima);
 *  • medidor rotulado ABAIXO | SUA FAIXA | ACIMA com marcador "Você · X kcal";
 *  • três cartões essenciais (Consumido / Gasto de hoje / Faixa de hoje);
 *  • CTA "Como calculamos sua faixa?" (abre a explicação; o déficit/superávit vive lá).
 * Só consome today.hud (motor energético no BFF). Nada é recalculado aqui.
 */
export function DiaryHud({ hud, onExplain }: { hud: FoodDiaryHud; onExplain: () => void }) {
  const statusTone =
    hud.status === "within" ? "success" : hud.status === "above" ? "accent" : "muted";

  // Presentation-only positions (não recalcula energia). Dá folga p/ "acima" aparecer.
  const scaleMax = Math.max(hud.bandHighKcal * 1.18, hud.consumedKcal * 1.08, 1);
  const belowPct = clampPct((hud.bandLowKcal / scaleMax) * 100);
  const bandPct = clampPct(((hud.bandHighKcal - hud.bandLowKcal) / scaleMax) * 100);
  const abovePct = clampPct(100 - belowPct - bandPct);
  const consumedPct = clampPct((hud.consumedKcal / scaleMax) * 100);

  const toEnter = Math.max(hud.bandLowKcal - hud.consumedKcal, 0);

  return (
    <section className="dia-rise space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      {/* Missão + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-accent">
            <Flame size={14} strokeWidth={2.4} />
            {hud.missionLabel}
          </p>
          <p className="mt-1 text-[15px] font-semibold leading-tight text-muted-foreground">
            {hud.goalLabel}
          </p>
        </div>
        <StatusPill tone={statusTone} status={hud.status} />
      </div>

      {/* Headline — muda com o estado */}
      <Headline status={hud.status} toEnter={toEnter} over={hud.kcalOverBandTop} untilTop={hud.kcalToBandTop} />

      {/* Medidor rotulado */}
      <div>
        <div className="relative pt-7">
          {/* Marcador "Você · X kcal" */}
          <div
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${markerAnchor(consumedPct)}%` }}
          >
            <span className="rounded-full bg-foreground px-2.5 py-1 text-[12px] font-bold text-background shadow-sm">
              Você · {formatKcal(hud.consumedKcal)} kcal
            </span>
            <span className="mx-auto block h-2 w-px bg-foreground/70" aria-hidden="true" />
          </div>

          {/* Barra: abaixo | faixa | acima (marcador fica fora do overflow p/ sobressair) */}
          <div className="relative">
            <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-surface-strong">
              <div className="h-full bg-transparent" style={{ width: `${belowPct}%` }} aria-hidden="true" />
              <div className="h-full bg-success/35" style={{ width: `${bandPct}%` }} aria-hidden="true" />
              <div className="h-full bg-accent/20" style={{ width: `${abovePct}%` }} aria-hidden="true" />
              {/* Bordas da faixa */}
              <span className="absolute inset-y-0 w-0.5 bg-success/70" style={{ left: `${belowPct}%` }} aria-hidden="true" />
              <span className="absolute inset-y-0 w-0.5 bg-success/70" style={{ left: `${belowPct + bandPct}%` }} aria-hidden="true" />
            </div>
            {/* Marcador "Você" */}
            <span
              className="absolute inset-y-[-3px] w-1.5 rounded-full bg-foreground ring-2 ring-surface"
              style={{ left: `calc(${consumedPct}% - 3px)` }}
              aria-hidden="true"
            />
          </div>

          {/* Números de referência da faixa */}
          <div className="mt-1.5 flex justify-between text-[13px] tabular-nums text-muted">
            <span>{formatKcal(hud.bandLowKcal)}</span>
            <span className="font-semibold text-muted-foreground">alvo {formatKcal(hud.alvoCentralKcal)}</span>
            <span>{formatKcal(hud.bandHighKcal)}</span>
          </div>
        </div>

        {/* Legenda ABAIXO | SUA FAIXA | ACIMA (não depende só de cor) */}
        <div className="mt-2.5 flex items-center justify-center gap-3 text-[13px] font-semibold">
          <Legend swatch="bg-surface-strong border border-border" label="Abaixo" active={hud.status === "below"} />
          <Legend swatch="bg-success/60" label="Sua faixa" active={hud.status === "within"} />
          <Legend swatch="bg-accent/50" label="Acima" active={hud.status === "above"} />
        </div>
      </div>

      {/* Três cartões essenciais */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <HudStat icon={Flame} tone="accent" label="Consumido" value={`${formatKcal(hud.consumedKcal)}`} unit="kcal" />
        <HudStat icon={Zap} tone="success" label="Gasto de hoje" value={`${formatKcal(hud.gastoDiaKcal)}`} unit="kcal" />
        <HudStat icon={Target} tone="neutral" label="Faixa de hoje" value={`${formatKcal(hud.bandLowKcal)}–${formatKcal(hud.bandHighKcal)}`} />
      </div>

      {/* Como calculamos */}
      <button
        type="button"
        onClick={onExplain}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background/40 px-4 py-3 text-[14px] font-semibold text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
      >
        <HelpCircle size={16} className="text-accent" />
        Como calculamos sua faixa?
      </button>
    </section>
  );
}

/* ─── Headline por estado ─── */

function Headline({
  status,
  toEnter,
  over,
  untilTop,
}: {
  status: string;
  toEnter: number;
  over: number;
  untilTop: number;
}) {
  if (status === "within") {
    return (
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
          <Check size={16} strokeWidth={2.6} />
        </span>
        <div>
          <p className="text-[22px] font-bold leading-tight text-foreground">
            Você está dentro da sua faixa hoje
          </p>
          {untilTop > 0 && (
            <p className="mt-0.5 text-[14px] leading-snug text-muted-foreground">
              Ainda cabem {formatKcal(untilTop)} kcal até o topo.
            </p>
          )}
        </div>
      </div>
    );
  }

  const value = status === "above" ? over : toEnter;
  const label = status === "above" ? "kcal acima da sua faixa" : "kcal para entrar na sua faixa";

  return (
    <div>
      <p className="font-display text-[40px] font-bold leading-none tracking-tight text-foreground">
        {formatKcal(value)}
      </p>
      <p className="mt-1.5 text-[15px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

/* ─── bits ─── */

function Legend({ swatch, label, active }: { swatch: string; label: string; active: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5",
        active ? "text-foreground" : "text-muted",
      ].join(" ")}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${swatch}`} aria-hidden="true" />
      {label}
      {active && <span className="text-[11px] font-normal">(você)</span>}
    </span>
  );
}

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
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold ${toneClass}`}>
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
  unit,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  tone: "accent" | "success" | "neutral";
  label: string;
  value: string;
  unit?: string;
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
      <p className="mt-2 font-display text-[17px] font-bold leading-tight tracking-tight text-foreground">
        {value}
        {unit && <span className="ml-1 text-[11px] font-medium text-muted">{unit}</span>}
      </p>
      <p className="mt-0.5 text-[12px] font-medium text-muted">{label}</p>
    </div>
  );
}
