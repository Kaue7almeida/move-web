"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Check, Loader2, Sparkles } from "lucide-react";

import type { FoodDiaryItemView, MealType } from "@/bff/modules/foodDiary/types";
import { analyzeEntry, createEntry } from "@/services/foodDiary/foodDiaryService";

import { CONTAINER_OPTIONS, MEAL_CHOICES, MEAL_LABELS } from "../_content";
import { describeFoodDiaryError } from "../_errors";
import { MealReview } from "./MealReview";

type Step = "form" | "processing" | "review" | "done" | "error";

function makeKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `txt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

/**
 * Fluxo de registro por TEXTO (mode="text") ou DOCINHO/PETISCO (mode="snack").
 * descrição → IA (structured output) → revisão (MealReview) → confirmação.
 * Sem foto, mesmo modelo final food_diary_items, mesmo ownership e beta guard.
 */
export function TextMealFlow({
  mode,
  onSaved,
  onDone,
}: {
  mode: "text" | "snack";
  onSaved: () => void;
  onDone: () => void;
}) {
  const isSnack = mode === "snack";

  const [step, setStep] = useState<Step>("form");
  const [mealType, setMealType] = useState<MealType>(isSnack ? "extra" : "almoco");
  const [description, setDescription] = useState("");
  const [size, setSize] = useState<string | null>(null);
  const [kcalHint, setKcalHint] = useState("");
  const [items, setItems] = useState<FoodDiaryItemView[]>([]);
  const [qualityOverall, setQualityOverall] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);

  const idempotencyKeyRef = useRef<string>(makeKey());

  const canSubmit = description.trim().length >= 3;

  async function run() {
    if (!canSubmit) {
      return;
    }

    setErrorMessage(null);
    setStep("processing");

    try {
      let id = entryId;

      if (!id) {
        const kcalNote = Number(kcalHint) > 0 ? `Estimativa do usuário: ~${Math.round(Number(kcalHint))} kcal.` : undefined;
        const created = await createEntry({
          mealType,
          inputKind: mode,
          textDescription: description.trim(),
          containerSize: isSnack && size ? (size as "pequeno" | "medio" | "grande") : undefined,
          userNotes: kcalNote,
          idempotencyKey: idempotencyKeyRef.current,
        });
        id = created.entry.id;
        setEntryId(id);
      }

      const analyzed = await analyzeEntry(id);

      if (analyzed.entry.status === "completed") {
        setItems(analyzed.entry.items);
        setQualityOverall(analyzed.entry.qualityOverall);
        setStep("review");
      } else {
        setErrorMessage("Não consegui estimar a partir da descrição. Tente detalhar melhor.");
        setStep("error");
      }
    } catch (caught) {
      setErrorMessage(describeFoodDiaryError(caught).message);
      setStep("error");
    }
  }

  if (step === "processing") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Loader2 size={26} className="animate-spin text-accent" />
        <p className="text-sm font-medium text-foreground">Estimando a partir da sua descrição…</p>
        <p className="text-[11px] text-muted">Usa IA e pode levar alguns segundos.</p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-muted text-accent">
          <AlertTriangle size={24} strokeWidth={1.8} />
        </span>
        <p className="max-w-sm text-sm text-muted">{errorMessage}</p>
        <button
          type="button"
          onClick={() => setStep("form")}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
        >
          Ajustar descrição
        </button>
      </div>
    );
  }

  if (step === "review") {
    return (
      <MealReview
        entryId={entryId ?? ""}
        items={items}
        qualityOverall={qualityOverall}
        confirmLabel={isSnack ? "Confirmar" : "Confirmar refeição"}
        onConfirmed={() => {
          onSaved();
          setStep("done");
        }}
      />
    );
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
          <Check size={32} strokeWidth={2.5} />
        </span>
        <p className="text-sm font-semibold text-foreground">Registrado no seu diário</p>
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

  // form
  return (
    <div className="space-y-4">
      {!isSnack && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Qual refeição?</p>
          <div className="flex flex-wrap gap-2">
            {MEAL_CHOICES.map((meal) => (
              <Chip key={meal} label={MEAL_LABELS[meal]} active={mealType === meal} onClick={() => setMealType(meal)} />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          {isSnack ? "O que você comeu?" : "Descreva o que comeu"}
        </p>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={isSnack ? 2 : 3}
          placeholder={isSnack ? "Ex.: 1 barra de chocolate ao leite" : "Ex.: 2 pães de queijo e um café com leite"}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted"
        />
      </div>

      {isSnack && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Tamanho <span className="ml-1 normal-case text-muted/70">(opcional)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {CONTAINER_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                active={size === option.value}
                onClick={() => setSize((current) => (current === option.value ? null : option.value))}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Calorias <span className="ml-1 normal-case text-muted/70">(opcional — se souber)</span>
        </p>
        <input
          type="number"
          inputMode="numeric"
          value={kcalHint}
          onChange={(event) => setKcalHint(event.target.value)}
          placeholder="Se não souber, a IA estima"
          className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted"
        />
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void run()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Sparkles size={16} />
        Estimar
      </button>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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
