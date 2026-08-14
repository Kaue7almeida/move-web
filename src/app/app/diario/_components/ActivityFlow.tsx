"use client";

import { useState } from "react";
import { Activity, ArrowLeft, Check, HelpCircle, Loader2, PenLine, Sparkles, Watch } from "lucide-react";

import {
  type ActivityEstimateOutcome,
  type ActivityEstimateView,
  WEIGHT_SOURCE_LABELS,
} from "@/bff/modules/foodDiary/activityEstimateFlow";
import { addActivity, estimateActivity } from "@/services/foodDiary/foodDiaryService";

import { describeFoodDiaryError } from "../_errors";

type Step = "chooser" | "form" | "processing" | "clarify" | "review" | "watch" | "done";

const EXAMPLES = [
  "caminhei 4 km em 50 min",
  "musculação por 45 min",
  "corri 5 km em 32 min",
  "dei 9 mil passos",
];

/**
 * Registro de atividade com duas portas: descrever (IA interpreta + regra estima o
 * gasto EXTRA) ou informar o gasto do relógio. Mesmo nível do fluxo textual de comida:
 * clarificação de UMA pergunta, confirmação de "extra vs. rotina" e card de revisão.
 */
export function ActivityFlow({ onSaved, onDone }: { onSaved: () => void; onDone: () => void }) {
  const [step, setStep] = useState<Step>("chooser");
  const [description, setDescription] = useState("");
  const [informedWeight, setInformedWeight] = useState<number | null>(null);
  const [forceExtra, setForceExtra] = useState(false);

  const [pending, setPending] = useState<ActivityEstimateOutcome | null>(null);
  const [clarifyAnswer, setClarifyAnswer] = useState("");
  const [estimate, setEstimate] = useState<ActivityEstimateView | null>(null);

  const [watchLabel, setWatchLabel] = useState("");
  const [watchKcal, setWatchKcal] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = description.trim().length >= 3;

  function applyOutcome(outcome: ActivityEstimateOutcome) {
    if (outcome.kind === "estimate") {
      setEstimate(outcome.estimate);
      setStep("review");
      return;
    }
    setPending(outcome);
    setClarifyAnswer("");
    setStep("clarify");
  }

  async function runEstimate(params: { description: string; weightKg?: number; forceExtra?: boolean }) {
    setErrorMessage(null);
    setStep("processing");

    try {
      const outcome = await estimateActivity({
        description: params.description,
        ...(params.weightKg !== undefined ? { weightKg: params.weightKg } : {}),
        ...(params.forceExtra ? { forceExtra: true } : {}),
      });
      applyOutcome(outcome);
    } catch (caught) {
      setErrorMessage(describeFoodDiaryError(caught).message);
      setStep("form");
    }
  }

  function submitClarification() {
    if (!pending) {
      return;
    }

    if (pending.kind === "needs_weight") {
      const weight = Number(clarifyAnswer);
      if (!(weight > 0)) {
        return;
      }
      setInformedWeight(weight);
      void runEstimate({ description, weightKg: weight, forceExtra });
      return;
    }

    // clarification textual (ex.: duração) — anexa a resposta e re-estima.
    const answer = clarifyAnswer.trim();
    const combined = answer ? `${description}. ${answer}` : description;
    setDescription(combined);
    void runEstimate({ description: combined, weightKg: informedWeight ?? undefined, forceExtra });
  }

  async function persist(label: string, kcalBurned: number) {
    if (saving || !(kcalBurned > 0)) {
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      await addActivity({ label, kcalBurned: Math.round(kcalBurned) });
      onSaved();
      setStep("done");
    } catch (caught) {
      setErrorMessage(describeFoodDiaryError(caught).message);
      setSaving(false);
    }
  }

  /* ── chooser ── */
  if (step === "chooser") {
    return (
      <div className="space-y-2.5">
        <OptionCard
          icon={PenLine}
          title="Descrever minha atividade"
          description="Ex.: caminhei 4 km em 50 min — a IA estima o gasto extra."
          onClick={() => setStep("form")}
        />
        <OptionCard
          icon={Watch}
          title="Tenho o gasto do relógio"
          description="Já sei quantas kcal gastei — é só informar."
          onClick={() => {
            setWatchLabel("");
            setWatchKcal("");
            setStep("watch");
          }}
        />
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Loader2 size={26} className="animate-spin text-accent" />
        <p className="text-sm font-medium text-foreground">Interpretando sua atividade…</p>
        <p className="text-[12px] text-muted">Usa IA e leva alguns segundos.</p>
      </div>
    );
  }

  /* ── clarify (weight / duration / routine / unrecognized) ── */
  if (step === "clarify" && pending) {
    return (
      <ClarifyStep
        pending={pending}
        answer={clarifyAnswer}
        onAnswer={setClarifyAnswer}
        onSubmit={submitClarification}
        onRoutineExtra={() => {
          setForceExtra(true);
          void runEstimate({ description, weightKg: informedWeight ?? undefined, forceExtra: true });
        }}
        onRoutineNormal={onDone}
        onUseWatch={() => {
          setWatchLabel("");
          setWatchKcal("");
          setStep("watch");
        }}
        onBack={() => setStep("form")}
      />
    );
  }

  /* ── review ── */
  if (step === "review" && estimate) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Atividade</p>
          <p className="mt-0.5 text-[18px] font-bold text-foreground">{estimate.label}</p>
          <p className="mt-0.5 text-[14px] text-muted-foreground">{estimate.detailLine}</p>
          <p className="mt-2 text-[13px] text-muted">
            Peso usado: <span className="font-semibold text-foreground">{estimate.weightKg} kg</span>{" "}
            ({WEIGHT_SOURCE_LABELS[estimate.weightSource]})
          </p>

          <div className="mt-3 rounded-xl border border-success/30 bg-success-soft/30 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-success">Gasto extra estimado</p>
            <p className="mt-0.5 font-display text-3xl font-bold text-foreground">
              ~{estimate.activeKcal.toLocaleString("pt-BR")}
              <span className="ml-1.5 text-sm font-medium text-muted">kcal</span>
            </p>
          </div>

          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Essa é uma aproximação. Se seu relógio registrou o gasto, você pode usar esse valor.
          </p>
        </div>

        {errorMessage && (
          <p className="text-[13px] font-medium text-accent" role="alert">
            {errorMessage}
          </p>
        )}

        <div className="space-y-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void persist(estimate.suggestedLabel, estimate.activeKcal)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-[15px] font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Confirmar estimativa
          </button>
          <button
            type="button"
            onClick={() => {
              setWatchLabel(estimate.label);
              setWatchKcal("");
              setStep("watch");
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-[14px] font-semibold text-foreground transition-colors hover:bg-surface-hover"
          >
            <Watch size={15} /> Usar valor do relógio
          </button>
          <button
            type="button"
            onClick={() => setStep("form")}
            className="w-full text-center text-[13px] font-medium text-muted hover:text-foreground"
          >
            Ajustar descrição
          </button>
        </div>
      </div>
    );
  }

  /* ── watch (manual kcal) ── */
  if (step === "watch") {
    const kcalValue = Math.round(Number(watchKcal));
    const canSave = kcalValue > 0 && !saving;

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setStep("chooser")}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-foreground"
        >
          <ArrowLeft size={14} /> Voltar
        </button>

        <div className="space-y-3">
          <label className="block">
            <span className="text-[13px] font-medium text-muted">Atividade</span>
            <input
              type="text"
              value={watchLabel}
              placeholder="Ex.: corrida, spinning…"
              onChange={(event) => setWatchLabel(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-[15px] text-foreground placeholder:text-muted"
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-muted">Gasto do relógio (kcal)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={watchKcal}
              placeholder="Ex.: 320"
              onChange={(event) => setWatchKcal(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-[15px] font-semibold text-foreground placeholder:font-normal placeholder:text-muted"
            />
          </label>
        </div>

        {errorMessage && (
          <p className="text-[13px] font-medium text-accent" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          disabled={!canSave}
          onClick={() => void persist(watchLabel.trim() || "Atividade", kcalValue)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-[15px] font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {canSave ? `Adicionar · ${kcalValue} kcal` : "Adicionar atividade"}
        </button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
          <Check size={32} strokeWidth={2.5} />
        </span>
        <p className="text-sm font-semibold text-foreground">Atividade registrada</p>
        <button
          type="button"
          onClick={onDone}
          className="mt-1 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
        >
          Ver meu dia
        </button>
      </div>
    );
  }

  /* ── form (describe) ── */
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setStep("chooser")}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-foreground"
      >
        <ArrowLeft size={14} /> Voltar
      </button>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[14px] font-bold text-foreground">
          <Activity size={16} className="text-accent" /> Como você se movimentou hoje?
        </p>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Ex.: caminhei 4 km em 50 min"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[15px] text-foreground placeholder:text-muted"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setDescription(example)}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <p className="text-[13px] font-medium text-accent" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void runEstimate({ description, weightKg: informedWeight ?? undefined, forceExtra })}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-[15px] font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Sparkles size={16} />
        Estimar gasto extra
      </button>
    </div>
  );
}

/* ─── clarify step ─── */

function ClarifyStep({
  pending,
  answer,
  onAnswer,
  onSubmit,
  onRoutineExtra,
  onRoutineNormal,
  onUseWatch,
  onBack,
}: {
  pending: ActivityEstimateOutcome;
  answer: string;
  onAnswer: (value: string) => void;
  onSubmit: () => void;
  onRoutineExtra: () => void;
  onRoutineNormal: () => void;
  onUseWatch: () => void;
  onBack: () => void;
}) {
  // ClarifyStep nunca recebe "estimate" (esse vai direto para a revisão); guarda p/ o TS.
  if (pending.kind === "estimate") {
    return null;
  }

  if (pending.kind === "unrecognized") {
    return (
      <div className="space-y-4 py-2 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-muted text-accent">
          <HelpCircle size={24} strokeWidth={1.8} />
        </span>
        <p className="mx-auto max-w-sm text-[14px] leading-relaxed text-muted-foreground">{pending.message}</p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={onUseWatch}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-[15px] font-bold text-accent-on transition-colors hover:bg-accent-hover"
          >
            <Watch size={15} /> Usar valor do relógio
          </button>
          <button type="button" onClick={onBack} className="w-full text-center text-[13px] font-medium text-muted hover:text-foreground">
            Descrever de outro jeito
          </button>
        </div>
      </div>
    );
  }

  if (pending.kind === "routine_check") {
    return (
      <div className="space-y-4 py-2">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-muted text-accent">
            <HelpCircle size={24} strokeWidth={1.8} />
          </span>
          <p className="mt-3 text-[15px] font-semibold text-foreground">{pending.question}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Seu plano já considera o movimento do dia a dia. Só somamos o que for além disso.
          </p>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={onRoutineExtra}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-[15px] font-bold text-accent-on transition-colors hover:bg-accent-hover"
          >
            Foi uma atividade extra
          </button>
          <button
            type="button"
            onClick={onRoutineNormal}
            className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-surface px-6 py-3 text-[14px] font-semibold text-foreground transition-colors hover:bg-surface-hover"
          >
            Faz parte da minha rotina
          </button>
        </div>
      </div>
    );
  }

  // needs_weight | clarification (textual)
  const isWeight = pending.kind === "needs_weight";

  return (
    <div className="space-y-4 py-2">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-muted text-accent">
          <HelpCircle size={24} strokeWidth={1.8} />
        </span>
        <p className="mt-3 text-[15px] font-semibold text-foreground">{pending.question}</p>
        {isWeight && (
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Usamos só para esta estimativa — não altera seu perfil nem seu plano.
          </p>
        )}
      </div>

      <input
        type={isWeight ? "number" : "text"}
        inputMode={isWeight ? "decimal" : "text"}
        autoFocus
        value={answer}
        onChange={(event) => onAnswer(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onSubmit();
          }
        }}
        placeholder={isWeight ? "Ex.: 80" : "Sua resposta"}
        className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-[15px] text-foreground placeholder:text-muted"
      />

      <button
        type="button"
        onClick={onSubmit}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-[15px] font-bold text-accent-on transition-colors hover:bg-accent-hover"
      >
        <Sparkles size={16} /> Continuar
      </button>
    </div>
  );
}

function OptionCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3.5 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent/40 hover:bg-surface-hover"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-foreground">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{description}</span>
      </span>
    </button>
  );
}
