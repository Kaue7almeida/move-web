"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Flame,
  Lightbulb,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import type { DiaryItem, DiaryMeal, MealType } from "../_mock/diaryMock";
import {
  DETECTION_BOXES,
  FOOD_CATALOG,
  MEAL_CHOICES,
  MEAL_LABELS,
  ANALYSIS_OBSERVATIONS,
  PROCESSING_STEPS,
  buildAnalysisItems,
  macrosForItem,
  nextId,
  sumMacros,
} from "../_mock/diaryMock";
import {
  ESCONDIDOS_OPTIONS,
  ORIGEM_OPTIONS,
  PREPARO_OPTIONS,
  PREP_TIPS,
} from "../_content";
import { useCountUp } from "./BalanceRing";
import { ExamplePlate } from "./bits";

type WizardStep = "prep" | "foto" | "contexto" | "processing" | "review" | "done";

const WIZARD_STEPS: Array<{ key: WizardStep; title: string }> = [
  { key: "prep", title: "Preparação" },
  { key: "foto", title: "Foto do prato" },
  { key: "contexto", title: "Contexto" },
  { key: "processing", title: "Análise" },
  { key: "review", title: "Revisão" },
  { key: "done", title: "Pronto" },
];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
        active
          ? "border-accent bg-accent text-accent-on shadow-[0_0_12px_rgba(242,106,27,0.3)]"
          : "border-border bg-surface text-muted-foreground hover:border-accent/40 hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function ConfidenceDot({ value }: { value: number }) {
  const color = value >= 0.85 ? "bg-success" : value >= 0.7 ? "bg-accent" : "bg-accent/50";
  const label = value >= 0.85 ? "alta" : value >= 0.7 ? "média" : "baixa";

  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      confiança {label}
    </span>
  );
}

export function MealWizard({
  initialMealType,
  mealOrdinal,
  onConfirm,
  onCancel,
}: {
  initialMealType: MealType;
  /** Quantas refeições já existem antes desta — alimenta o selo de celebração. */
  mealOrdinal: number;
  onConfirm: (meal: DiaryMeal) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<WizardStep>("prep");
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [useExample, setUseExample] = useState(false);
  const [origem, setOrigem] = useState<string | null>(null);
  const [preparo, setPreparo] = useState<string | null>(null);
  const [escondidos, setEscondidos] = useState<string[]>([]);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [items, setItems] = useState<DiaryItem[]>([]);
  const [addFoodId, setAddFoodId] = useState("");
  const [confirmedTotalKcal, setConfirmedTotalKcal] = useState(0);
  const objectUrlRef = useRef<string | null>(null);

  const stepIndex = WIZARD_STEPS.findIndex((wizardStep) => wizardStep.key === step);
  const percent = Math.round(((stepIndex + 1) / WIZARD_STEPS.length) * 100);

  const totals = useMemo(() => sumMacros(items), [items]);
  const reviewKcal = useCountUp(totals.kcal, 450);
  const doneKcal = useCountUp(step === "done" ? confirmedTotalKcal : 0, 1000);

  /* ─── Foto local (nada é enviado a lugar nenhum) ─── */

  function handlePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPhotoUrl(url);
    setUseExample(false);
  }

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  /* ─── Animação de processamento (timing de UI; dados são fixos) ─── */

  useEffect(() => {
    if (step !== "processing") {
      return;
    }

    const timers: number[] = [];

    PROCESSING_STEPS.forEach((_, index) => {
      timers.push(window.setTimeout(() => setProcessingIndex(index), index * 850));
    });

    timers.push(
      window.setTimeout(() => {
        setItems(buildAnalysisItems());
        setStep("review");
      }, PROCESSING_STEPS.length * 850 + 550),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [step]);

  /* ─── Revisão ─── */

  function updateGrams(itemId: string, gramas: number) {
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, gramas } : item)));
  }

  function removeItem(itemId: string) {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }

  function addItem() {
    const food = FOOD_CATALOG.find((catalogFood) => catalogFood.id === addFoodId);

    if (!food) {
      return;
    }

    setItems((current) => [
      ...current,
      {
        id: nextId("item"),
        foodId: food.id,
        nome: food.nome,
        categoria: food.categoria,
        gramas: 100,
        gramasEstimadas: 100,
        confianca: 1,
        fonte: "manual",
      },
    ]);
    setAddFoodId("");
  }

  function confirmMeal() {
    setConfirmedTotalKcal(totals.kcal);
    onConfirm({
      id: nextId("meal"),
      mealType,
      loggedAtLabel: "agora",
      itens: items,
    });
    setStep("done");
  }

  const availableFoods = FOOD_CATALOG.filter(
    (food) => !items.some((item) => item.foodId === food.id),
  );

  const escondidosNote =
    escondidos.length > 0
      ? `Você marcou ${escondidos.join(", ").toLowerCase()} como não visíveis — na versão real eles entram na estimativa.`
      : null;

  /* ─── Render ─── */

  return (
    <div className="dia-rise mx-auto max-w-2xl">
      {/* Cabeçalho do fluxo (em página, dentro do AppShell) */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">{WIZARD_STEPS[stepIndex]?.title}</p>
              <p className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted">
                Passo {stepIndex + 1} de {WIZARD_STEPS.length}
              </p>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-strong">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {/* ── 1. Preparação ── */}
          {step === "prep" && (
            <div className="space-y-3">
              {PREP_TIPS.map((tip) => (
                <div
                  key={tip.title}
                  className={[
                    "flex items-start gap-4 rounded-xl border p-4",
                    tip.highlight
                      ? "border-accent/40 bg-accent-muted ring-1 ring-accent/20"
                      : "border-border bg-surface",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      tip.highlight ? "bg-accent text-accent-on" : "bg-accent-muted text-accent",
                    ].join(" ")}
                  >
                    <tip.icon size={20} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-foreground">
                      {tip.title}
                      {tip.highlight && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                          + precisão
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tip.description}</p>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setStep("foto")}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
              >
                Entendi, vamos lá
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ── 2. Foto ── */}
          {step === "foto" && (
            <div className="space-y-4">
              {photoUrl || useExample ? (
                <div className="dia-pop relative overflow-hidden rounded-2xl border border-border">
                  {useExample ? (
                    <ExamplePlate className="aspect-[4/3] w-full" />
                  ) : (
                    <div
                      role="img"
                      aria-label="Pré-visualização do prato"
                      className="aspect-[4/3] w-full bg-surface-strong bg-cover bg-center"
                      style={{ backgroundImage: `url("${photoUrl}")` }}
                    />
                  )}
                </div>
              ) : (
                <label
                  htmlFor="dia-photo-input"
                  className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface/50 px-6 text-center transition-colors hover:border-accent/40 hover:bg-surface-hover"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-muted text-accent">
                    <Camera size={26} strokeWidth={1.7} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Foto do prato</p>
                    <p className="mt-0.5 text-xs text-muted">De cima, prato inteiro, talher ao lado</p>
                  </div>
                </label>
              )}

              <input
                id="dia-photo-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="sr-only"
              />

              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="dia-photo-input"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-strong px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
                >
                  <Camera size={14} />
                  {photoUrl || useExample ? "Trocar foto" : "Abrir câmera"}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setUseExample(true);
                    setPhotoUrl(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-strong px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
                >
                  <Lightbulb size={14} />
                  Usar prato de exemplo
                </button>
              </div>
            </div>
          )}

          {/* ── 3. Contexto ── */}
          {step === "contexto" && (
            <div className="space-y-5">
              <ContextGroup label="Qual refeição?">
                {MEAL_CHOICES.map((meal) => (
                  <Chip
                    key={meal}
                    label={MEAL_LABELS[meal]}
                    active={mealType === meal}
                    onClick={() => setMealType(meal)}
                  />
                ))}
              </ContextGroup>

              <ContextGroup label="Origem" optional>
                {ORIGEM_OPTIONS.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    active={origem === option}
                    onClick={() => setOrigem(origem === option ? null : option)}
                  />
                ))}
              </ContextGroup>

              <ContextGroup label="Preparo predominante" optional>
                {PREPARO_OPTIONS.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    active={preparo === option}
                    onClick={() => setPreparo(preparo === option ? null : option)}
                  />
                ))}
              </ContextGroup>

              <ContextGroup label="Tem algo que não aparece na foto?" optional>
                {ESCONDIDOS_OPTIONS.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    active={escondidos.includes(option)}
                    onClick={() =>
                      setEscondidos((current) =>
                        current.includes(option)
                          ? current.filter((value) => value !== option)
                          : [...current, option],
                      )
                    }
                  />
                ))}
              </ContextGroup>
            </div>
          )}

          {/* ── 4. Processamento ── */}
          {step === "processing" && (
            <div className="space-y-5">
              <div className="relative overflow-hidden rounded-2xl border border-border">
                {useExample ? (
                  <ExamplePlate className="aspect-[4/3] w-full" />
                ) : (
                  <div
                    className="aspect-[4/3] w-full bg-surface-strong bg-cover bg-center"
                    style={photoUrl ? { backgroundImage: `url("${photoUrl}")` } : undefined}
                  />
                )}
                <div className="dia-scanline" style={{ top: 0 }} />
                {processingIndex >= 1 &&
                  DETECTION_BOXES.slice(0, Math.min(processingIndex + 1, DETECTION_BOXES.length)).map(
                    (box, index) => (
                      <div
                        key={box.label}
                        className="dia-detection-box"
                        style={{
                          top: `${box.top}%`,
                          left: `${box.left}%`,
                          width: `${box.width}%`,
                          height: `${box.height}%`,
                          animationDelay: `${index * 120}ms`,
                        }}
                      >
                        <span className="dia-detection-label">{box.label}</span>
                      </div>
                    ),
                  )}
              </div>

              <ul className="space-y-2.5">
                {PROCESSING_STEPS.map((label, index) => {
                  if (index > processingIndex) {
                    return null;
                  }

                  const isDone = index < processingIndex;

                  return (
                    <li key={label} className="dia-rise flex items-center gap-3 text-sm">
                      <span
                        className={[
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                          isDone ? "bg-success-soft text-success" : "bg-accent-soft text-accent",
                        ].join(" ")}
                      >
                        {isDone ? (
                          <Check size={13} strokeWidth={3} />
                        ) : (
                          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                        )}
                      </span>
                      <span className={isDone ? "text-muted" : "font-medium text-foreground"}>{label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* ── 5. Revisão ── */}
          {step === "review" && (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-muted">
                A IA estima, você confirma. Ajuste as gramas, remova o que não está no prato ou adicione
                o que faltou — as calorias recalculam na hora.
              </p>

              <ul className="space-y-3">
                {items.map((item) => {
                  const macros = macrosForItem(item);
                  const maxGrams = Math.max(Math.round((item.gramas * 2) / 5) * 5, 100);

                  return (
                    <li key={item.id} className="rounded-xl border border-border bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{item.nome}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {item.categoria}
                            </span>
                            <ConfidenceDot value={item.confianca} />
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-display text-base font-bold text-foreground">
                            {macros.kcal}
                            <span className="ml-0.5 text-[10px] font-medium text-muted">kcal</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                            title="Remover item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <input
                          type="range"
                          min={5}
                          max={maxGrams}
                          step={5}
                          value={item.gramas}
                          onChange={(event) => updateGrams(item.id, Number(event.target.value))}
                          className="h-1.5 flex-1 cursor-pointer accent-[#f26a1b]"
                          aria-label={`Gramas de ${item.nome}`}
                        />
                        <span className="w-14 shrink-0 text-right text-xs font-semibold text-foreground">
                          {item.gramas} g
                        </span>
                      </div>

                      <p className="mt-2 text-[11px] text-muted">
                        P {macros.proteinaG}g · C {macros.carboG}g · G {macros.gorduraG}g
                      </p>
                    </li>
                  );
                })}
              </ul>

              {/* Adicionar item que a IA não viu */}
              <div className="flex items-center gap-2">
                <select
                  value={addFoodId}
                  onChange={(event) => setAddFoodId(event.target.value)}
                  className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground"
                  aria-label="Adicionar alimento"
                >
                  <option value="">Adicionar alimento que faltou...</option>
                  {availableFoods.map((food) => (
                    <option key={food.id} value={food.id}>
                      {food.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addItem}
                  disabled={addFoodId === ""}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-strong text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                  title="Adicionar"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Observações da "IA" */}
              <div className="space-y-1.5 rounded-xl border border-border bg-surface p-4">
                {[...ANALYSIS_OBSERVATIONS, ...(escondidosNote ? [escondidosNote] : [])].map(
                  (observation) => (
                    <p key={observation} className="flex gap-2 text-[11px] leading-relaxed text-muted">
                      <Lightbulb size={13} className="mt-0.5 shrink-0 text-accent" />
                      {observation}
                    </p>
                  ),
                )}
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                    Total da refeição
                  </p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {reviewKcal.toLocaleString("pt-BR")}{" "}
                    <span className="text-sm font-medium text-muted">kcal</span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={confirmMeal}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Check size={16} strokeWidth={2.5} />
                  Confirmar refeição
                </button>
              </div>
            </div>
          )}

          {/* ── 6. Concluído ── */}
          {step === "done" && (
            <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 py-6 text-center">
              <div className="relative">
                <span className="dia-ripple" style={{ ["--dia-delay" as string]: "200ms" }} />
                <span className="dia-ripple" style={{ ["--dia-delay" as string]: "600ms" }} />
                <div className="dia-check-spring relative flex h-24 w-24 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check size={48} strokeWidth={2.5} />
                </div>
              </div>

              <div className="dia-rise">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
                  {MEAL_LABELS[mealType]} registrado
                </p>
                <p className="mt-1 font-display text-5xl font-bold tracking-tight text-foreground">
                  +{doneKcal.toLocaleString("pt-BR")}
                  <span className="ml-1.5 text-lg font-medium text-muted">kcal</span>
                </p>
              </div>

              <div className="dia-pop inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-sm font-bold text-accent">
                <Flame size={16} strokeWidth={2} />
                {mealOrdinal >= 4 ? "Dia completo! 4+ refeições registradas" : `${mealOrdinal}ª refeição de hoje`}
              </div>

              <button
                type="button"
                onClick={onCancel}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
              >
                Ver meu dia
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Rodapé de navegação — escondido no processamento e no done */}
        {step !== "processing" && step !== "done" && (
          <div className="flex items-center gap-2 border-t border-border px-5 py-4">
            {step === "prep" ? (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-strong px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                Cancelar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(WIZARD_STEPS[Math.max(0, stepIndex - 1)].key)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-strong px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>
            )}

            {step !== "review" && (
              <button
                type="button"
                onClick={() => advance(step, setStep)}
                disabled={step === "foto" && !photoUrl && !useExample}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                {step === "contexto" ? (
                  <>
                    <Sparkles size={16} />
                    Analisar prato
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ContextGroup({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
        {optional && <span className="ml-1 normal-case text-muted/70">(opcional)</span>}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function advance(step: WizardStep, setStep: (step: WizardStep) => void) {
  const flow: Record<WizardStep, WizardStep> = {
    prep: "foto",
    foto: "contexto",
    contexto: "processing",
    processing: "review",
    review: "done",
    done: "done",
  };
  setStep(flow[step]);
}
