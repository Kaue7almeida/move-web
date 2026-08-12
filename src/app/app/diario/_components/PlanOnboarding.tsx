"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Info, Loader2, ScanLine, Sparkles, Target } from "lucide-react";
import Link from "next/link";

import {
  computeEnergyPlan,
  estimateTmbFromBodyFat,
  GOAL_LABELS,
  type GoalKind,
  ROUTINE_LEVEL_LABELS,
  type RoutineLevel,
  suggestedPlannedBalance,
  type TmbSource,
} from "@/bff/modules/foodDiary/planEnergy";
import type { FoodDiaryPlanView, TmbSuggestion } from "@/bff/modules/foodDiary/types/plan";
import { getPlan, upsertPlan } from "@/services/foodDiary/foodDiaryService";

import { useAppShell } from "../../AppShellContext";
import { describeFoodDiaryError } from "../_errors";
import { formatKcal } from "../_content";

const GOALS: GoalKind[] = ["lose", "maintain", "gain"];
const ROUTINES: RoutineLevel[] = ["sedentary", "light", "moderate", "high"];

/**
 * Onboarding do plano energético (Meu Plano). Substitui a configuração simples de
 * calorias: objetivo + TMB (Scan / % de gordura / manual) + rotina + saldo
 * planejado. Reusa o motor puro (planEnergy) para o preview ao vivo — o BFF é a
 * fonte da verdade ao salvar.
 */
export function PlanOnboarding({ onSaved }: { onSaved: () => void }) {
  const { me } = useAppShell();
  // MoveScan é student-only; não oferecer um CTA de Scan que quebraria para um
  // trainer/personal. Ele usa % de gordura ou TMB manual.
  const canScan = me.isStudent;

  const [suggestion, setSuggestion] = useState<TmbSuggestion | null>(null);
  const [existing, setExisting] = useState<FoodDiaryPlanView | null>(null);
  const [loading, setLoading] = useState(true);

  const [goal, setGoal] = useState<GoalKind>("maintain");
  const [tmbSource, setTmbSource] = useState<TmbSource>("manual");
  const [manualTmb, setManualTmb] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatPercent, setBodyFatPercent] = useState("");
  const [routineLevel, setRoutineLevel] = useState<RoutineLevel>("light");
  const [balance, setBalance] = useState<number>(0);
  const [balanceTouched, setBalanceTouched] = useState(false);

  const [showTmbInfo, setShowTmbInfo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getPlan()
      .then((response) => {
        if (!active) {
          return;
        }

        setSuggestion(response.tmbSuggestion);
        setExisting(response.plan);

        if (response.plan) {
          setGoal(response.plan.goal);
          setTmbSource(response.plan.tmbSource);
          setManualTmb(String(response.plan.tmbKcal));
          setRoutineLevel(response.plan.routineLevel);
          setBalance(response.plan.plannedBalanceKcal);
          setBalanceTouched(true);
        } else if (response.tmbSuggestion.hasScan) {
          setTmbSource("scan");
        }

        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Saldo efetivo: segue a sugestão do objetivo até o usuário mexer no slider
  // (derivado — sem setState em efeito).
  const effectiveBalance = balanceTouched ? balance : suggestedPlannedBalance(goal);

  const previewTmb = useMemo(() => {
    if (tmbSource === "manual") {
      return Number(manualTmb) || 0;
    }
    if (tmbSource === "body_fat") {
      return estimateTmbFromBodyFat(Number(weightKg) || 0, Number(bodyFatPercent) || 0);
    }
    return suggestion?.tmbKcal ?? 0;
  }, [tmbSource, manualTmb, weightKg, bodyFatPercent, suggestion]);

  const preview = useMemo(
    () =>
      previewTmb > 0
        ? computeEnergyPlan({ tmbKcal: previewTmb, routineLevel, activitiesKcal: 0, plannedBalanceKcal: effectiveBalance })
        : null,
    [previewTmb, routineLevel, effectiveBalance],
  );

  const canSubmit =
    previewTmb > 0 &&
    (tmbSource !== "body_fat" || (Number(weightKg) > 0 && Number(bodyFatPercent) > 0));

  async function submit() {
    if (!canSubmit || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await upsertPlan({
        goal,
        tmbSource,
        tmbKcal: tmbSource === "manual" ? Math.round(Number(manualTmb)) : undefined,
        weightKg: tmbSource === "body_fat" ? Number(weightKg) : undefined,
        bodyFatPercent: tmbSource === "body_fat" ? Number(bodyFatPercent) : undefined,
        routineLevel,
        plannedBalanceKcal: Math.round(effectiveBalance),
      });
      onSaved();
    } catch (caught) {
      setError(describeFoodDiaryError(caught).message);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-border bg-surface p-10 text-sm text-muted">
        <Loader2 size={18} className="animate-spin text-accent" />
        Preparando seu plano...
      </div>
    );
  }

  return (
    <section className="dia-rise space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <header className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-muted text-accent">
          <Target size={26} strokeWidth={1.8} />
        </div>
        <h2 className="mt-3 font-display text-xl font-bold text-foreground">
          {existing ? "Ajustar meu plano" : "Vamos montar seu plano"}
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">
          Seu objetivo define a faixa-alvo do dia. Tudo é editável — são estimativas, não prescrição.
        </p>
      </header>

      {/* Objetivo */}
      <Group label="Qual seu objetivo?">
        <div className="grid grid-cols-3 gap-2">
          {GOALS.map((option) => (
            <ChoiceCard
              key={option}
              active={goal === option}
              label={GOAL_LABELS[option]}
              onClick={() => setGoal(option)}
            />
          ))}
        </div>
      </Group>

      {/* TMB */}
      <Group
        label="Sua TMB (taxa metabólica basal)"
        action={
          <button
            type="button"
            onClick={() => setShowTmbInfo((v) => !v)}
            className={[
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
              showTmbInfo ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            <Info size={12} /> Entenda
          </button>
        }
      >
        {showTmbInfo && (
          <p className="dia-rise mb-2 rounded-lg bg-surface-strong/60 p-2.5 text-[11px] leading-relaxed text-muted">
            A TMB é a energia que o corpo gasta em repouso. Usamos a mesma fórmula do MoveScan
            (sobre a massa magra). Ela é a base do seu gasto do dia — some sua rotina e atividades por
            cima. É uma estimativa, não um exame.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {suggestion?.hasScan && (
            <SourceChip active={tmbSource === "scan"} onClick={() => setTmbSource("scan")} label="Do meu MoveScan" />
          )}
          <SourceChip active={tmbSource === "body_fat"} onClick={() => setTmbSource("body_fat")} label="Por % de gordura" />
          <SourceChip active={tmbSource === "manual"} onClick={() => setTmbSource("manual")} label="Informar TMB" />
        </div>

        {tmbSource === "scan" && (
          <div className="mt-3 rounded-xl border border-border bg-background/40 p-3 text-sm">
            {suggestion?.tmbKcal ? (
              <p className="text-foreground">
                Do seu último Scan: <span className="font-bold">{formatKcal(suggestion.tmbKcal)} kcal</span>
                {suggestion.leanMassKg ? (
                  <span className="text-muted"> · massa magra {suggestion.leanMassKg} kg</span>
                ) : null}
              </p>
            ) : (
              <p className="text-muted">Seu Scan não trouxe uma TMB utilizável — use % de gordura ou informe manualmente.</p>
            )}
          </div>
        )}

        {tmbSource === "body_fat" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <LabeledInput label="Peso (kg)" value={weightKg} onChange={setWeightKg} placeholder="80" />
            <LabeledInput label="% de gordura" value={bodyFatPercent} onChange={setBodyFatPercent} placeholder="20" />
          </div>
        )}

        {tmbSource === "manual" && (
          <div className="mt-3">
            <LabeledInput label="TMB (kcal/dia)" value={manualTmb} onChange={setManualTmb} placeholder="1700" />
          </div>
        )}

        {canScan && !suggestion?.hasScan && (
          <Link
            href="/app/scan"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent hover:underline"
          >
            <ScanLine size={13} /> Fazer um MoveScan para uma TMB mais precisa
          </Link>
        )}
      </Group>

      {/* Rotina */}
      <Group label="Como é sua rotina fora dos treinos?">
        <div className="space-y-2">
          {ROUTINES.map((option) => (
            <RoutineRow
              key={option}
              active={routineLevel === option}
              label={ROUTINE_LEVEL_LABELS[option]}
              onClick={() => setRoutineLevel(option)}
            />
          ))}
        </div>
      </Group>

      {/* Saldo planejado */}
      <Group label="Saldo planejado (kcal/dia)">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={-1000}
            max={1000}
            step={50}
            value={effectiveBalance}
            onChange={(event) => {
              setBalance(Number(event.target.value));
              setBalanceTouched(true);
            }}
            className="h-1.5 flex-1 cursor-pointer accent-[#f26a1b]"
            aria-label="Saldo planejado em kcal"
          />
          <span className="w-16 shrink-0 text-right text-sm font-bold tabular-nums text-foreground">
            {effectiveBalance > 0 ? "+" : ""}
            {effectiveBalance}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted">
          {effectiveBalance < 0
            ? "Déficit — abaixo do gasto do dia."
            : effectiveBalance > 0
              ? "Superávit — acima do gasto do dia."
              : "Manutenção — no gasto do dia."}
        </p>
      </Group>

      {/* Preview */}
      {preview && (
        <div className="rounded-2xl border border-accent/30 bg-accent-muted/40 p-4 ring-1 ring-accent/10">
          <p className="text-[11px] font-medium uppercase tracking-wider text-accent">Sua faixa-alvo do dia</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">
            {formatKcal(preview.bandLowKcal)}–{formatKcal(preview.bandHighKcal)}
            <span className="ml-1.5 text-sm font-medium text-muted">kcal</span>
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            TMB {formatKcal(preview.tmbKcal)} × rotina {preview.routineFactor} = gasto base{" "}
            {formatKcal(preview.gastoBaseKcal)} kcal. Atividades do dia entram por cima.
          </p>
        </div>
      )}

      {error && (
        <p className="text-[12px] font-medium text-accent" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!canSubmit || submitting}
        onClick={() => void submit()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-accent-on shadow-[0_8px_30px_rgba(242,106,27,0.28)] transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {existing ? "Salvar plano" : "Ativar meu plano"}
        {!submitting && <ArrowRight size={16} />}
      </button>
    </section>
  );
}

/* ─── bits ─── */

function Group({ label, action, children }: { label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function ChoiceCard({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-2 py-3 text-xs font-bold transition-all",
        active
          ? "border-accent bg-accent text-accent-on shadow-[0_0_14px_rgba(242,106,27,0.28)]"
          : "border-border bg-surface text-muted-foreground hover:border-accent/40 hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function SourceChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
        active
          ? "border-accent bg-accent text-accent-on"
          : "border-border bg-surface text-muted-foreground hover:border-accent/40 hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function RoutineRow({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
        active ? "border-accent bg-accent-muted text-foreground" : "border-border bg-surface text-muted-foreground hover:bg-surface-hover",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
          active ? "border-accent" : "border-border-strong",
        ].join(" ")}
      >
        {active && <span className="h-2 w-2 rounded-full bg-accent" />}
      </span>
      {label}
    </button>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted"
      />
    </label>
  );
}
