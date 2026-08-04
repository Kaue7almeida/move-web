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
  Ruler,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";

import type { DiaryEntry, DiaryItem, Macros, MealType } from "../_mock/mock";
import {
  DETECTION_BOXES,
  FOOD_CATALOG,
  MEAL_CHOICES,
  MEAL_LABELS,
  MOCK_OBSERVATIONS,
  PROCESSING_STEPS,
  buildMockAnalysisItems,
  macrosForItem,
  nextId,
  sumMacros,
} from "../_mock/mock";
import { useCountUp } from "./BalanceRing";
import { ConfettiRain, ExamplePlate } from "./bits";

type WizardStep = "prep" | "foto" | "contexto" | "processing" | "review" | "done";

const WIZARD_STEPS: Array<{ key: WizardStep; title: string }> = [
  { key: "prep", title: "Preparo" },
  { key: "foto", title: "Foto do prato" },
  { key: "contexto", title: "Contexto" },
  { key: "processing", title: "Análise" },
  { key: "review", title: "Revisão" },
  { key: "done", title: "Pronto" },
];

const PREP_TIPS = [
  {
    icon: Ruler,
    title: "Objeto de referência ao lado",
    description:
      "Um talher ou a sua mão ao lado do prato calibra a escala — é o que mais aumenta a precisão.",
    highlight: true,
  },
  {
    icon: Camera,
    title: "Fotografe de cima",
    description: "Segure o celular na vertical, a 90° do prato, com o prato inteiro no quadro.",
    highlight: false,
  },
  {
    icon: Sun,
    title: "Boa iluminação",
    description: "Evite sombras fortes cobrindo parte da comida.",
    highlight: false,
  },
];

const ORIGEM_OPTIONS = ["Caseiro", "Restaurante", "Embalado"];
const PREPARO_OPTIONS = ["Grelhado", "Frito", "Cozido", "Assado", "Cru"];
const ESCONDIDOS_OPTIONS = ["Óleo", "Manteiga", "Açúcar", "Molho"];

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
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
  const color =
    value >= 0.85 ? "bg-success" : value >= 0.7 ? "bg-accent" : "bg-accent/50";
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
  dayEntryCount,
  onConfirm,
  onClose,
}: {
  initialMealType: MealType;
  /** Refeições já registradas hoje (antes desta) — alimenta o selo de celebração. */
  dayEntryCount: number;
  onConfirm: (entry: DiaryEntry) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<WizardStep>("prep");
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [useExample, setUseExample] = useState(false);
  const [origem, setOrigem] = useState<string | null>(null);
  const [preparo, setPreparo] = useState<string | null>(null);
  const [escondidos, setEscondidos] = useState<string[]>([]);
  const [dividir, setDividir] = useState(false);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [items, setItems] = useState<DiaryItem[]>([]);
  const [addFoodId, setAddFoodId] = useState("");
  const [confirmedTotals, setConfirmedTotals] = useState<Macros | null>(null);
  // Congelado na confirmação: onConfirm adiciona a refeição ao dia antes do done
  // renderizar, então dayEntryCount já viria incrementado (off-by-one no selo).
  const [confirmedOrdinal, setConfirmedOrdinal] = useState(1);
  const objectUrlRef = useRef<string | null>(null);

  const stepIndex = WIZARD_STEPS.findIndex((wizardStep) => wizardStep.key === step);
  const percent = Math.round(((stepIndex + 1) / WIZARD_STEPS.length) * 100);

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

  /* ─── Animação de processamento ─── */

  useEffect(() => {
    if (step !== "processing") {
      return;
    }

    // O primeiro timer (index 0, delay 0) já reseta o índice — nada síncrono aqui.
    const timers: number[] = [];

    PROCESSING_STEPS.forEach((_, index) => {
      timers.push(
        window.setTimeout(() => setProcessingIndex(index), index * 900),
      );
    });

    timers.push(
      window.setTimeout(() => {
        setItems(buildMockAnalysisItems());
        setStep("review");
      }, PROCESSING_STEPS.length * 900 + 600),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [step]);

  /* ─── Revisão: edição local de itens ─── */

  const activeItems = items;
  const totals = useMemo(() => sumMacros(activeItems), [activeItems]);
  const reviewKcal = useCountUp(totals.kcal, 450);
  // Contagem teatral do passo final: só sobe quando a celebração entra em cena.
  const doneKcal = useCountUp(step === "done" ? (confirmedTotals?.kcal ?? 0) : 0, 1100);

  function updateGrams(itemId: string, gramas: number) {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, gramas } : item)),
    );
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
    const entry: DiaryEntry = {
      id: nextId("entry"),
      mealType,
      loggedAtISO: new Date().toISOString(),
      itens: activeItems,
    };

    setConfirmedTotals(totals);
    setConfirmedOrdinal(dayEntryCount + 1);
    onConfirm(entry);
    setStep("done");
  }

  const availableFoods = FOOD_CATALOG.filter(
    (food) => !activeItems.some((item) => item.foodId === food.id),
  );

  const escondidosNote =
    escondidos.length > 0
      ? `Você marcou ${escondidos.join(", ").toLowerCase()} como não visíveis — na versão final eles entram na estimativa.`
      : null;

  /* ─── Render ─── */

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="relative my-4 w-full max-w-2xl px-4 pb-10 sm:my-10">
        <div className="dlab-rise rounded-2xl border border-border bg-background shadow-2xl">
          {/* Header do wizard */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">
                  {WIZARD_STEPS[stepIndex]?.title}
                </p>
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
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 sm:p-6">
            {/* ─── Passo 1: preparo ─── */}
            {step === "prep" && (
              <div className="space-y-3">
                {PREP_TIPS.map((tip, index) => (
                  <div
                    key={tip.title}
                    className={[
                      "dlab-rise flex items-start gap-4 rounded-xl border p-4",
                      tip.highlight
                        ? "border-accent/40 bg-accent-muted ring-1 ring-accent/20"
                        : "border-border bg-surface",
                    ].join(" ")}
                    style={{ animationDelay: `${index * 110}ms` }}
                  >
                    <div
                      className={[
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                        tip.highlight
                          ? "bg-accent text-accent-on"
                          : "bg-accent-muted text-accent",
                      ].join(" ")}
                    >
                      <tip.icon size={20} strokeWidth={1.8} />
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                        {tip.title}
                        {tip.highlight && (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                            + precisão
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {tip.description}
                      </p>
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

            {/* ─── Passo 2: foto ─── */}
            {step === "foto" && (
              <div className="space-y-4">
                {photoUrl || useExample ? (
                  <div className="dlab-pop relative overflow-hidden rounded-2xl border border-border">
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
                    htmlFor="dlab-photo-input"
                    className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface/50 px-6 text-center transition-colors hover:border-accent/40 hover:bg-surface-hover"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-muted text-accent">
                      <Camera size={26} strokeWidth={1.7} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Foto do prato</p>
                      <p className="mt-0.5 text-xs text-muted">
                        De cima, prato inteiro, talher ao lado
                      </p>
                    </div>
                  </label>
                )}

                <input
                  id="dlab-photo-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="sr-only"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="dlab-photo-input"
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

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep("prep")}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
                  >
                    <ArrowLeft size={14} />
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={!photoUrl && !useExample}
                    onClick={() => setStep("contexto")}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continuar
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ─── Passo 3: contexto ─── */}
            {step === "contexto" && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Qual refeição?
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MEAL_CHOICES.map((meal) => (
                      <Chip
                        key={meal}
                        label={MEAL_LABELS[meal]}
                        active={mealType === meal}
                        onClick={() => setMealType(meal)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Origem <span className="normal-case text-muted/70">(opcional)</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ORIGEM_OPTIONS.map((option) => (
                      <Chip
                        key={option}
                        label={option}
                        active={origem === option}
                        onClick={() => setOrigem(origem === option ? null : option)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Preparo predominante <span className="normal-case text-muted/70">(opcional)</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PREPARO_OPTIONS.map((option) => (
                      <Chip
                        key={option}
                        label={option}
                        active={preparo === option}
                        onClick={() => setPreparo(preparo === option ? null : option)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Tem algo que não aparece na foto?{" "}
                    <span className="normal-case text-muted/70">(opcional)</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
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
                  </div>
                </div>

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                  <span className="text-sm font-medium text-foreground">
                    Vou dividir esse prato
                  </span>
                  <input
                    type="checkbox"
                    checked={dividir}
                    onChange={(event) => setDividir(event.target.checked)}
                    className="h-4 w-4 accent-[#f26a1b]"
                  />
                </label>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep("foto")}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
                  >
                    <ArrowLeft size={14} />
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("processing")}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
                  >
                    <Sparkles size={16} />
                    Analisar prato
                  </button>
                </div>
              </div>
            )}

            {/* ─── Passo 4: processamento (o show) ─── */}
            {step === "processing" && (
              <div className="space-y-5">
                <div className="dlab-processing-frame">
                  <div className="relative overflow-hidden rounded-[18px] bg-background">
                    {useExample ? (
                      <ExamplePlate className="aspect-[4/3] w-full" />
                    ) : (
                      <div
                        className="aspect-[4/3] w-full bg-surface-strong bg-cover bg-center"
                        style={photoUrl ? { backgroundImage: `url("${photoUrl}")` } : undefined}
                      />
                    )}

                    <div className="dlab-grid" />
                    <div className="dlab-scanline" />
                    <span className="dlab-corner dlab-corner-tl" />
                    <span className="dlab-corner dlab-corner-tr" />
                    <span className="dlab-corner dlab-corner-bl" />
                    <span className="dlab-corner dlab-corner-br" />

                    {/* Caixas de detecção aparecem conforme a análise avança */}
                    {processingIndex >= 1 &&
                      DETECTION_BOXES.slice(
                        0,
                        Math.min(processingIndex + 1, DETECTION_BOXES.length),
                      ).map((box, index) => (
                        <div
                          key={box.label}
                          className="dlab-detection-box"
                          style={{
                            top: `${box.top}%`,
                            left: `${box.left}%`,
                            width: `${box.width}%`,
                            height: `${box.height}%`,
                            animationDelay: `${index * 120}ms`,
                          }}
                        >
                          <span className="dlab-detection-label">{box.label}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <ul className="space-y-2.5">
                  {PROCESSING_STEPS.map((label, index) => {
                    if (index > processingIndex) {
                      return null;
                    }

                    const isDone = index < processingIndex;

                    return (
                      <li
                        key={label}
                        className="dlab-step-in flex items-center gap-3 text-sm"
                      >
                        <span
                          className={[
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                            isDone
                              ? "bg-success-soft text-success"
                              : "bg-accent-soft text-accent",
                          ].join(" ")}
                        >
                          {isDone ? (
                            <Check size={13} strokeWidth={3} />
                          ) : (
                            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                          )}
                        </span>
                        <span
                          className={
                            isDone ? "text-muted" : "font-medium text-foreground"
                          }
                        >
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* ─── Passo 5: revisão ─── */}
            {step === "review" && (
              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-muted">
                  A IA estima, você confirma. Ajuste as gramas, remova o que não está no
                  prato ou adicione o que faltou — as calorias recalculam na hora.
                </p>

                <ul className="space-y-3">
                  {activeItems.map((item, index) => {
                    const macros = macrosForItem(item);
                    const maxGrams = Math.max(Math.round((item.gramas * 2) / 5) * 5, 100);

                    return (
                      <li
                        key={item.id}
                        className="dlab-rise rounded-xl border border-border bg-surface p-4"
                        style={{ animationDelay: `${index * 90}ms` }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-foreground">
                              {item.nome}
                            </p>
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
                              <span className="ml-0.5 text-[10px] font-medium text-muted">
                                kcal
                              </span>
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
                            onChange={(event) =>
                              updateGrams(item.id, Number(event.target.value))
                            }
                            className="dlab-range flex-1"
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
                  {[...MOCK_OBSERVATIONS, ...(escondidosNote ? [escondidosNote] : [])].map(
                    (observation) => (
                      <p key={observation} className="flex gap-2 text-[11px] leading-relaxed text-muted">
                        <Lightbulb size={13} className="mt-0.5 shrink-0 text-accent" />
                        {observation}
                      </p>
                    ),
                  )}
                </div>

                {/* Total + confirmar */}
                <div className="sticky bottom-0 -mx-5 border-t border-border bg-background/95 px-5 pb-1 pt-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                        Total da refeição
                      </p>
                      <p className="font-display text-2xl font-bold text-foreground">
                        {reviewKcal}{" "}
                        <span className="text-sm font-medium text-muted">kcal</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={activeItems.length === 0}
                      onClick={confirmMeal}
                      className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Check size={16} strokeWidth={2.5} />
                      Confirmar refeição
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Passo 6: celebração (lenta e teatral, estilo Duolingo) ─── */}
            {step === "done" && (
              <div className="relative flex min-h-[400px] flex-col items-center justify-center gap-4 py-8 text-center">
                {/* Chuva de confete (2.2–3.6s, com balanço) */}
                <ConfettiRain />

                {/* Check com mola + ondas expandindo */}
                <div className="relative">
                  <span className="dlab-ripple" style={{ ["--dlab-delay" as string]: "200ms" }} />
                  <span className="dlab-ripple" style={{ ["--dlab-delay" as string]: "550ms" }} />
                  <span className="dlab-ripple" style={{ ["--dlab-delay" as string]: "900ms" }} />
                  <div className="dlab-check-spring relative flex h-24 w-24 items-center justify-center rounded-full bg-success-soft text-success">
                    <Check size={48} strokeWidth={2.5} />
                  </div>
                </div>

                {/* Refeição registrada + kcal contando */}
                <div className="dlab-rise" style={{ animationDelay: "500ms" }}>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
                    {MEAL_LABELS[mealType]} registrado
                  </p>
                  <p className="mt-1 font-display text-5xl font-bold tracking-tight text-foreground">
                    +{doneKcal}
                    <span className="ml-1.5 text-lg font-medium text-muted">kcal</span>
                  </p>
                </div>

                {/* Macros da refeição */}
                {confirmedTotals && (
                  <p
                    className="dlab-rise text-xs text-muted"
                    style={{ animationDelay: "950ms" }}
                  >
                    <span className="font-semibold text-success">P {confirmedTotals.proteinaG}g</span>
                    {" · "}
                    <span className="font-semibold text-accent">C {confirmedTotals.carboG}g</span>
                    {" · "}
                    <span className="font-semibold text-foreground">G {confirmedTotals.gorduraG}g</span>
                  </p>
                )}

                {/* Selo gamificado */}
                <div
                  className="dlab-pop inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-sm font-bold text-accent"
                  style={{ animationDelay: "1300ms" }}
                >
                  <Flame size={16} strokeWidth={2} />
                  {confirmedOrdinal >= 4
                    ? "Dia completo! 4+ refeições registradas"
                    : `${confirmedOrdinal}ª refeição de hoje`}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="dlab-rise mt-3 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
                  style={{ animationDelay: "1750ms" }}
                >
                  Ver meu dia
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
