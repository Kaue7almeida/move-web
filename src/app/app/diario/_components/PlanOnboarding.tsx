"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Gauge, Info, Loader2, ScanLine, Sparkles, Target } from "lucide-react";
import Link from "next/link";

import { coerceBalanceToGoal } from "@/bff/modules/foodDiary/planBuild";
import {
  computeEnergyPlan,
  estimateTmbFromBodyFat,
  GOAL_LABELS,
  type GoalKind,
  type RoutineLevel,
  suggestedPlannedBalance,
  type TmbSource,
} from "@/bff/modules/foodDiary/planEnergy";
import type { FoodDiaryPlanView, TmbSuggestion } from "@/bff/modules/foodDiary/types/plan";
import { getPlan, upsertPlan } from "@/services/foodDiary/foodDiaryService";

import { useAppShell } from "../../AppShellContext";
import {
  formatKcal,
  GOAL_DESCRIPTIONS,
  INTENSITY_PRESETS,
  ROUTINE_DESCRIPTIONS,
  ROUTINE_SHORT_LABELS,
} from "../_content";
import { describeFoodDiaryError } from "../_errors";

const GOALS: GoalKind[] = ["lose", "maintain", "gain"];
const ROUTINES: RoutineLevel[] = ["sedentary", "light", "moderate", "high"];
const TOTAL_STEPS = 3;

/**
 * Meu Plano — wizard mobile de 3 passos (2.1): Objetivo → Metabolismo → Rotina+Plano.
 * Substitui a config longa por passos curtos e legíveis. NÃO cria nova fórmula de TMB
 * nem segundo motor: usa exatamente o conceito atual (planEnergy) por baixo. O BFF é a
 * fonte da verdade ao salvar; o preview reusa o motor puro.
 */
export function PlanOnboarding({ onSaved }: { onSaved: () => void }) {
  const { me } = useAppShell();
  // MoveScan é student-only; não oferecer um CTA de Scan que quebraria para um
  // trainer/personal. Ele usa % de gordura ou TMB manual.
  const canScan = me.isStudent;

  const [suggestion, setSuggestion] = useState<TmbSuggestion | null>(null);
  const [existing, setExisting] = useState<FoodDiaryPlanView | null>(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<GoalKind>("maintain");
  const [tmbSource, setTmbSource] = useState<TmbSource>("manual");
  const [unknownHelp, setUnknownHelp] = useState(false);
  const [manualTmb, setManualTmb] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatPercent, setBodyFatPercent] = useState("");
  const [routineLevel, setRoutineLevel] = useState<RoutineLevel>("light");
  const [balance, setBalance] = useState<number>(0);
  const [balanceTouched, setBalanceTouched] = useState(false);
  const [showCustomBalance, setShowCustomBalance] = useState(false);

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

  // Saldo efetivo — sempre coagido ao objetivo (lose ≤ 0 · maintain = 0 · gain ≥ 0),
  // derivado (sem setState em efeito). O preview mostrado é o que será persistido.
  const effectiveBalance = coerceBalanceToGoal(goal, balanceTouched ? balance : suggestedPlannedBalance(goal));

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

  const metabolismReady =
    !unknownHelp
    && previewTmb > 0
    && (tmbSource !== "body_fat" || (Number(weightKg) > 0 && Number(bodyFatPercent) > 0));

  const canSubmit = metabolismReady && preview !== null;

  function selectSource(source: TmbSource) {
    setTmbSource(source);
    setUnknownHelp(false);
  }

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
    <section className="dia-rise space-y-5">
      {/* Progresso */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold uppercase tracking-wider text-accent">
            Passo {step} de {TOTAL_STEPS}
          </p>
          <p className="text-[13px] font-medium text-muted">{STEP_TITLES[step - 1]}</p>
        </div>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <span
              key={index}
              className={[
                "h-1.5 flex-1 rounded-full transition-colors",
                index < step ? "bg-accent" : "bg-surface-strong",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <StepObjetivo goal={goal} onPick={setGoal} />
      )}

      {step === 2 && (
        <StepMetabolismo
          tmbSource={tmbSource}
          unknownHelp={unknownHelp}
          suggestion={suggestion}
          canScan={canScan}
          manualTmb={manualTmb}
          weightKg={weightKg}
          bodyFatPercent={bodyFatPercent}
          onSelectSource={selectSource}
          onUnknown={() => setUnknownHelp(true)}
          onManualTmb={setManualTmb}
          onWeight={setWeightKg}
          onBodyFat={setBodyFatPercent}
        />
      )}

      {step === 3 && (
        <StepRotinaPlano
          goal={goal}
          routineLevel={routineLevel}
          onRoutine={setRoutineLevel}
          effectiveBalance={effectiveBalance}
          showCustomBalance={showCustomBalance}
          onPreset={(value) => {
            setBalance(value);
            setBalanceTouched(true);
            setShowCustomBalance(false);
          }}
          onCustom={() => setShowCustomBalance(true)}
          onBalance={(value) => {
            setBalance(coerceBalanceToGoal(goal, value));
            setBalanceTouched(true);
          }}
          preview={preview}
          existing={existing !== null}
        />
      )}

      {error && (
        <p className="text-[13px] font-medium text-accent" role="alert">
          {error}
        </p>
      )}

      {/* Navegação */}
      <div className="flex items-center gap-3 pt-1">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((current) => current - 1)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-3 text-[14px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        )}

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            disabled={step === 2 && !metabolismReady}
            onClick={() => setStep((current) => current + 1)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-[15px] font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continuar <ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={() => void submit()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-[15px] font-bold text-accent-on shadow-[0_8px_30px_rgba(242,106,27,0.28)] transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {existing ? "Salvar plano" : "Ativar meu plano"}
          </button>
        )}
      </div>
    </section>
  );
}

const STEP_TITLES = ["Objetivo", "Metabolismo", "Rotina e plano"];

/* ─── PASSO 1 — Objetivo ─── */

function StepObjetivo({ goal, onPick }: { goal: GoalKind; onPick: (goal: GoalKind) => void }) {
  return (
    <div className="space-y-4">
      <Header title="Qual é o seu objetivo?" subtitle="Ele define a faixa-alvo do seu dia. Dá pra mudar quando quiser." />
      <div className="space-y-2.5">
        {GOALS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onPick(option)}
            aria-pressed={goal === option}
            className={[
              "dia-selectable flex w-full items-center gap-3 rounded-2xl border p-4 text-left",
              goal === option
                ? "border-accent bg-accent-muted/40 ring-1 ring-accent/30"
                : "border-border bg-surface hover:border-accent/40",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                goal === option ? "border-accent" : "border-border-strong",
              ].join(" ")}
            >
              {goal === option && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-bold text-foreground">{GOAL_LABELS[option]}</span>
              <span className="mt-0.5 block text-[14px] leading-snug text-muted-foreground">
                {GOAL_DESCRIPTIONS[option]}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── PASSO 2 — Metabolismo ─── */

function StepMetabolismo({
  tmbSource,
  unknownHelp,
  suggestion,
  canScan,
  manualTmb,
  weightKg,
  bodyFatPercent,
  onSelectSource,
  onUnknown,
  onManualTmb,
  onWeight,
  onBodyFat,
}: {
  tmbSource: TmbSource;
  unknownHelp: boolean;
  suggestion: TmbSuggestion | null;
  canScan: boolean;
  manualTmb: string;
  weightKg: string;
  bodyFatPercent: string;
  onSelectSource: (source: TmbSource) => void;
  onUnknown: () => void;
  onManualTmb: (value: string) => void;
  onWeight: (value: string) => void;
  onBodyFat: (value: string) => void;
}) {
  const hasScan = suggestion?.hasScan ?? false;

  return (
    <div className="space-y-4">
      <Header
        title="Seu metabolismo (TMB)"
        subtitle="A TMB é a energia que seu corpo gasta em repouso — a base do seu gasto do dia. De onde tiramos a sua?"
      />

      <div className="space-y-2.5">
        {hasScan && (
          <SourceCard
            active={!unknownHelp && tmbSource === "scan"}
            title="Usar meu MoveScan"
            description={
              suggestion?.tmbKcal
                ? `Do seu último Scan: ${formatKcal(suggestion.tmbKcal)} kcal${suggestion.leanMassKg ? ` · massa magra ${suggestion.leanMassKg} kg` : ""}`
                : "Seu Scan não trouxe uma TMB utilizável — use outra opção."
            }
            onClick={() => onSelectSource("scan")}
          />
        )}
        <SourceCard
          active={!unknownHelp && tmbSource === "body_fat"}
          title="Tenho meu % de gordura"
          description="Estimamos sua TMB a partir do peso e do percentual de gordura."
          onClick={() => onSelectSource("body_fat")}
        />
        <SourceCard
          active={!unknownHelp && tmbSource === "manual"}
          title="Já sei minha TMB"
          description="Você informa o valor em kcal/dia."
          onClick={() => onSelectSource("manual")}
        />
        <SourceCard
          active={unknownHelp}
          title="Não sei esses dados"
          description="Sem problema — te mostramos como conseguir."
          onClick={onUnknown}
        />
      </div>

      {/* Campos condicionais */}
      {!unknownHelp && tmbSource === "body_fat" && (
        <div className="grid grid-cols-2 gap-2">
          <LabeledInput label="Peso (kg)" value={weightKg} onChange={onWeight} placeholder="80" />
          <LabeledInput label="% de gordura" value={bodyFatPercent} onChange={onBodyFat} placeholder="20" />
        </div>
      )}

      {!unknownHelp && tmbSource === "manual" && (
        <LabeledInput label="TMB (kcal/dia)" value={manualTmb} onChange={onManualTmb} placeholder="1700" />
      )}

      {/* Área educativa "Não sei" */}
      {unknownHelp && (
        <div className="dia-rise space-y-3 rounded-2xl border border-accent/25 bg-accent-muted/25 p-4">
          <p className="flex items-center gap-1.5 text-[14px] font-bold text-foreground">
            <Info size={15} className="text-accent" /> Como descobrir sua TMB
          </p>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            A TMB depende da sua composição corporal — seu <strong>% de gordura</strong> e sua{" "}
            <strong>massa magra</strong>. Esses dados podem vir de uma avaliação física ou de uma
            bioimpedância.
          </p>
          {canScan && (
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              No Move, o <strong>MoveScan</strong> é a análise corporal <strong>por foto</strong>:
              estima seu % de gordura e sua massa magra sem precisar de balança.
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {canScan && (
              <Link
                href="/app/scan"
                className="dia-selectable inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-[14px] font-bold text-accent-on hover:bg-accent-hover"
              >
                <ScanLine size={15} /> Fazer meu MoveScan
              </Link>
            )}
            <button
              type="button"
              onClick={() => onSelectSource("body_fat")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2.5 text-[14px] font-semibold text-foreground transition-colors hover:bg-surface-hover"
            >
              Tenho % de gordura
            </button>
            <button
              type="button"
              onClick={() => onSelectSource("manual")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2.5 text-[14px] font-semibold text-foreground transition-colors hover:bg-surface-hover"
            >
              Informar TMB
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── PASSO 3 — Rotina + Plano ─── */

function StepRotinaPlano({
  goal,
  routineLevel,
  onRoutine,
  effectiveBalance,
  showCustomBalance,
  onPreset,
  onCustom,
  onBalance,
  preview,
  existing,
}: {
  goal: GoalKind;
  routineLevel: RoutineLevel;
  onRoutine: (level: RoutineLevel) => void;
  effectiveBalance: number;
  showCustomBalance: boolean;
  onPreset: (balance: number) => void;
  onCustom: () => void;
  onBalance: (balance: number) => void;
  preview: ReturnType<typeof computeEnergyPlan> | null;
  existing: boolean;
}) {
  const presets = goal === "lose" ? INTENSITY_PRESETS.lose : goal === "gain" ? INTENSITY_PRESETS.gain : [];
  const matchedPreset = presets.find((preset) => preset.balance === effectiveBalance);
  const isCustom = presets.length > 0 && !matchedPreset;
  const sliderRange = goal === "lose" ? { min: -1000, max: 0 } : { min: 0, max: 1000 };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Header title="Como é sua rotina?" subtitle="Fora dos treinos que você registra — só o dia a dia." />
        <div className="grid grid-cols-2 gap-2">
          {ROUTINES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onRoutine(option)}
              aria-pressed={routineLevel === option}
              className={[
                "dia-selectable rounded-2xl border p-3.5 text-left",
                routineLevel === option
                  ? "border-accent bg-accent-muted/40 ring-1 ring-accent/30"
                  : "border-border bg-surface hover:border-accent/40",
              ].join(" ")}
            >
              <span className="block text-[15px] font-bold text-foreground">{ROUTINE_SHORT_LABELS[option]}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted">{ROUTINE_DESCRIPTIONS[option]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Intensidade do objetivo (lose/gain) — saldo por baixo. Manutenção = neutra. */}
      {presets.length > 0 ? (
        <div className="space-y-3">
          <Header title="Intensidade do objetivo" subtitle={goal === "lose" ? "Quão abaixo do gasto você quer ficar." : "Quão acima do gasto você quer ficar."} />
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => onPreset(preset.balance)}
                aria-pressed={!isCustom && matchedPreset?.key === preset.key}
                className={[
                  "rounded-xl border px-4 py-2.5 text-[14px] font-semibold transition-colors",
                  !isCustom && matchedPreset?.key === preset.key
                    ? "border-accent bg-accent text-accent-on"
                    : "border-border bg-surface text-muted-foreground hover:border-accent/40 hover:text-foreground",
                ].join(" ")}
              >
                {preset.label}
                <span className="ml-1.5 text-[12px] opacity-80">
                  {preset.balance > 0 ? "+" : ""}
                  {preset.balance}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={onCustom}
              aria-pressed={showCustomBalance || isCustom}
              className={[
                "rounded-xl border px-4 py-2.5 text-[14px] font-semibold transition-colors",
                showCustomBalance || isCustom
                  ? "border-accent bg-accent text-accent-on"
                  : "border-border bg-surface text-muted-foreground hover:border-accent/40 hover:text-foreground",
              ].join(" ")}
            >
              Personalizado
            </button>
          </div>

          {(showCustomBalance || isCustom) && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <input
                type="range"
                min={sliderRange.min}
                max={sliderRange.max}
                step={50}
                value={effectiveBalance}
                onChange={(event) => onBalance(Number(event.target.value))}
                className="h-1.5 flex-1 cursor-pointer accent-[#f26a1b]"
                aria-label="Saldo planejado em kcal por dia"
              />
              <span className="w-20 shrink-0 text-right text-[14px] font-bold tabular-nums text-foreground">
                {effectiveBalance > 0 ? "+" : ""}
                {effectiveBalance} kcal
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3.5 text-[14px] leading-relaxed text-muted-foreground">
          <Target size={16} className="shrink-0 text-accent" />
          Manutenção: sua faixa fica no seu gasto do dia, sem déficit nem superávit.
        </p>
      )}

      {/* Tela final — plano pronto */}
      {preview && (
        <div className="dia-rise rounded-2xl border border-success/30 bg-success-soft/30 p-5 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-success-soft text-success">
            <Gauge size={22} strokeWidth={1.9} />
          </span>
          <p className="mt-2.5 text-[16px] font-bold text-foreground">
            {existing ? "Seu plano atualizado" : "Seu plano está pronto"}
          </p>
          <p className="mt-1 text-[13px] font-medium uppercase tracking-wider text-muted">Sua faixa-alvo inicial</p>
          <p className="mt-1 font-display text-3xl font-bold text-foreground">
            {formatKcal(preview.bandLowKcal)}–{formatKcal(preview.bandHighKcal)}
            <span className="ml-1.5 text-sm font-medium text-muted">kcal</span>
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            TMB {formatKcal(preview.tmbKcal)} × rotina {preview.routineFactor} = gasto base{" "}
            {formatKcal(preview.gastoBaseKcal)} kcal. Suas atividades entram por cima, dia a dia.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── bits ─── */

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-[18px] font-bold leading-tight text-foreground">{title}</h3>
      <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function SourceCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "dia-selectable flex w-full items-center gap-3 rounded-2xl border p-4 text-left",
        active ? "border-accent bg-accent-muted/40 ring-1 ring-accent/30" : "border-border bg-surface hover:border-accent/40",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
          active ? "border-accent" : "border-border-strong",
        ].join(" ")}
      >
        {active && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-bold text-foreground">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{description}</span>
      </span>
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
      <span className="text-[13px] font-medium text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="dia-field mt-1 h-12 w-full px-3.5 font-semibold"
      />
    </label>
  );
}
