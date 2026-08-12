"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Flame,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import type {
  ContainerSize,
  FoodDiaryItemView,
  MealOrigin,
  MealType,
} from "@/bff/modules/foodDiary/types";
import {
  analyzeEntry,
  confirmEntry,
  createEntry,
  deleteEntry,
  reviewEntry,
  uploadEntryPhoto,
} from "@/services/foodDiary/foodDiaryService";

import {
  CONTAINER_OPTIONS,
  ESCONDIDOS_OPTIONS,
  MEAL_CHOICES,
  MEAL_LABELS,
  MEAL_ORIGIN_OPTIONS,
  PREP_TIPS,
} from "../_content";
import { describeFoodDiaryError, type FoodDiaryErrorInfo } from "../_errors";
import { itemGrams, itemMacros, sumMacros } from "../_nutrition";
import { useCountUp } from "./BalanceRing";

type WizardStep = "prep" | "foto" | "contexto" | "processing" | "review" | "done" | "error";

const WIZARD_STEPS: Array<{ key: WizardStep; title: string }> = [
  { key: "prep", title: "Preparação" },
  { key: "foto", title: "Foto do prato" },
  { key: "contexto", title: "Contexto" },
  { key: "processing", title: "Análise" },
  { key: "review", title: "Revisão" },
  { key: "done", title: "Pronto" },
];

/** Rótulos de progresso durante a análise real (apenas UI — a IA roda de fato). */
const PROCESSING_LABELS = [
  "Enviando sua foto com segurança",
  "Analisando enquadramento e iluminação",
  "Identificando os alimentos do prato",
  "Estimando as porções em gramas",
  "Calculando os valores nutricionais",
];

function makeIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `wiz-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

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
  onSaved,
  onExit,
}: {
  initialMealType: MealType;
  /** Chamado uma vez quando a refeição é confirmada (a página re-busca o dia). */
  onSaved: () => void;
  /** Fecha o fluxo e volta ao diário. */
  onExit: () => void;
}) {
  const [step, setStep] = useState<WizardStep>("prep");

  // Contexto da refeição.
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [containerSize, setContainerSize] = useState<ContainerSize | null>(null);
  const [mealOrigin, setMealOrigin] = useState<MealOrigin | null>(null);
  const [escondidos, setEscondidos] = useState<string[]>([]);
  const [isShared, setIsShared] = useState(false);
  const [notes, setNotes] = useState("");

  // Foto.
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Processamento / revisão.
  const [processingLabel, setProcessingLabel] = useState(0);
  const [items, setItems] = useState<FoodDiaryItemView[]>([]);
  const [gramsById, setGramsById] = useState<Record<string, number>>({});
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [qualityOverall, setQualityOverall] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<FoodDiaryErrorInfo | null>(null);
  const [confirmedTotalKcal, setConfirmedTotalKcal] = useState(0);

  // Controle de ciclo de vida (refs — sobrevivem a re-renders e ao unmount).
  const objectUrlRef = useRef<string | null>(null);
  const entryIdRef = useRef<string | null>(null);
  const statusRef = useRef<string | null>(null);
  const confirmedRef = useRef(false);
  const cleanedRef = useRef(false);
  const photoUploadedRef = useRef(false);
  const idempotencyKeyRef = useRef<string>(makeIdempotencyKey());

  const barStep: WizardStep = step === "error" ? "processing" : step;
  const stepIndex = WIZARD_STEPS.findIndex((wizardStep) => wizardStep.key === barStep);
  const percent = Math.round(((stepIndex + 1) / WIZARD_STEPS.length) * 100);

  const activeItems = useMemo(
    () => items.filter((item) => !removedIds.has(item.id)),
    [items, removedIds],
  );
  const totals = useMemo(
    () => sumMacros(activeItems.map((item) => itemMacros(item, gramsById[item.id] ?? itemGrams(item)))),
    [activeItems, gramsById],
  );
  // Itens ambíguos precisam de escolha do usuário antes de confirmar.
  const unresolvedAmbiguous = useMemo(
    () =>
      activeItems.some(
        (item) =>
          item.identification === "ambiguous" &&
          item.alternatives.length > 0 &&
          !(item.id in nameById),
      ),
    [activeItems, nameById],
  );
  const reviewKcal = useCountUp(totals.kcal, 450);
  const doneKcal = useCountUp(step === "done" ? confirmedTotalKcal : 0, 1000);

  /* ─── Limpeza de rascunho abandonado (Fase 11) ─── */

  const cleanupDraft = useCallback(() => {
    if (cleanedRef.current) {
      return;
    }

    const id = entryIdRef.current;

    // Só apaga se: existe rascunho, não foi confirmado e não está em processamento.
    if (id && !confirmedRef.current && statusRef.current !== "processing") {
      cleanedRef.current = true;
      void deleteEntry(id).catch(() => {
        // best-effort: um rascunho não confirmado não aparece no diário de qualquer forma.
      });
    }
  }, []);

  const exit = useCallback(() => {
    cleanupDraft();
    onExit();
  }, [cleanupDraft, onExit]);

  // Revoga o object URL e limpa o rascunho ao desmontar.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      cleanupDraft();
    };
  }, [cleanupDraft]);

  /* ─── Foto local (preview via object URL) ─── */

  function handlePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];

    if (!selected) {
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const url = URL.createObjectURL(selected);
    objectUrlRef.current = url;
    setPhotoUrl(url);
    setFile(selected);
    photoUploadedRef.current = false;
  }

  /* ─── Rotação dos rótulos de progresso enquanto a análise real roda ─── */

  useEffect(() => {
    if (step !== "processing") {
      return;
    }

    // A reinicialização do índice acontece em runAnalysis (handler), não aqui,
    // para não disparar setState síncrono no corpo do efeito.
    const timer = window.setInterval(() => {
      setProcessingLabel((current) => Math.min(current + 1, PROCESSING_LABELS.length - 1));
    }, 1600);

    return () => window.clearInterval(timer);
  }, [step]);

  /* ─── Lifecycle real: draft → upload → analyze ─── */

  const runAnalysis = useCallback(async () => {
    setErrorInfo(null);
    setProcessingLabel(0);
    setStep("processing");

    try {
      // 1. Garante um rascunho (reutiliza se já criado numa tentativa anterior).
      let id = entryIdRef.current;

      if (!id) {
        const created = await createEntry({
          mealType,
          containerSize: containerSize ?? undefined,
          mealOrigin: mealOrigin ?? undefined,
          hiddenIngredients: escondidos.length > 0 ? escondidos : undefined,
          isSharedPortion: isShared || undefined,
          userNotes: notes.trim() || undefined,
          idempotencyKey: idempotencyKeyRef.current,
        });
        id = created.entry.id;
        entryIdRef.current = id;
        statusRef.current = created.entry.status;
      }

      // 2. Envia a foto (só se ainda não enviada para esta seleção).
      if (file && !photoUploadedRef.current) {
        const uploaded = await uploadEntryPhoto(id, file);
        statusRef.current = uploaded.entry.status;
        photoUploadedRef.current = true;
      }

      // 3. Análise real (pode levar alguns segundos). Marca "processing" ANTES do
      // await: se o usuário abandonar durante a análise, a limpeza NÃO apaga o
      // registro em processamento (evita corrida com o processamento no servidor).
      statusRef.current = "processing";
      const analyzed = await analyzeEntry(id);
      statusRef.current = analyzed.entry.status;

      if (analyzed.entry.status === "completed") {
        const entry = analyzed.entry;
        const grams: Record<string, number> = {};

        for (const item of entry.items) {
          grams[item.id] = itemGrams(item);
        }

        setItems(entry.items);
        setGramsById(grams);
        setRemovedIds(new Set());
        setNameById({});
        setQualityOverall(entry.qualityOverall);
        setReviewError(null);
        setStep("review");
      } else {
        // needsRetake ou estado inesperado → pedir nova foto.
        setErrorInfo({
          title: "Não consegui usar essa foto",
          message: "Verifique o enquadramento e a iluminação e tente outra foto do prato inteiro, de cima.",
          retake: true,
          retryable: false,
        });
        setStep("error");
      }
    } catch (caught) {
      setErrorInfo(describeFoodDiaryError(caught));
      setStep("error");
    }
  }, [mealType, containerSize, mealOrigin, escondidos, isShared, notes, file]);

  /* ─── Revisão ─── */

  function updateGrams(itemId: string, grams: number) {
    setGramsById((current) => ({ ...current, [itemId]: grams }));
  }

  function toggleRemoved(itemId: string) {
    setRemovedIds((current) => {
      const next = new Set(current);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  }

  async function confirmMeal() {
    const id = entryIdRef.current;

    if (!id || activeItems.length === 0 || confirming || unresolvedAmbiguous) {
      return;
    }

    setConfirming(true);
    setReviewError(null);

    try {
      // PATCH em lote (não por tecla): grama confirmada + remoções + identidade
      // escolhida para itens ambíguos.
      await reviewEntry(id, {
        items: items.map((item) => ({
          id: item.id,
          gramsConfirmed: gramsById[item.id] ?? itemGrams(item),
          isRemoved: removedIds.has(item.id),
          ...(nameById[item.id] ? { name: nameById[item.id] } : {}),
        })),
      });

      const confirmed = await confirmEntry(id);
      confirmedRef.current = true;
      statusRef.current = confirmed.entry.status;
      setConfirmedTotalKcal(confirmed.entry.confirmedTotals.kcal ?? totals.kcal);
      onSaved();
      setStep("done");
    } catch (caught) {
      setReviewError(describeFoodDiaryError(caught).message);
      setConfirming(false);
    }
  }

  /* ─── Ações de erro ─── */

  function retryFromError() {
    if (!errorInfo) {
      return;
    }

    if (errorInfo.retake) {
      // Nova foto: mantém o rascunho, força novo upload.
      photoUploadedRef.current = false;
      setErrorInfo(null);
      setStep("foto");
    } else {
      void runAnalysis();
    }
  }

  const qualityNote =
    qualityOverall === "media"
      ? "A foto tinha qualidade média — confira as estimativas com atenção."
      : qualityOverall === "ruim"
        ? "A foto tinha qualidade baixa — as estimativas podem estar imprecisas."
        : null;

  /* ─── Render ─── */

  return (
    <div className="dia-rise mx-auto max-w-2xl">
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">
                {step === "error" ? "Vamos ajustar" : WIZARD_STEPS[stepIndex]?.title}
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
            onClick={exit}
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
              {photoUrl ? (
                <div className="dia-pop relative overflow-hidden rounded-2xl border border-border">
                  <div
                    role="img"
                    aria-label="Pré-visualização do prato"
                    className="aspect-[4/3] w-full bg-surface-strong bg-cover bg-center"
                    style={{ backgroundImage: `url("${photoUrl}")` }}
                  />
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

              <label
                htmlFor="dia-photo-input"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-strong px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                <Camera size={14} />
                {photoUrl ? "Trocar foto" : "Abrir câmera"}
              </label>
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

              <ContextGroup label="Tamanho do prato/recipiente" optional>
                {CONTAINER_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    active={containerSize === option.value}
                    onClick={() =>
                      setContainerSize((current) => (current === option.value ? null : option.value))
                    }
                  />
                ))}
              </ContextGroup>

              <ContextGroup label="Origem" optional>
                {MEAL_ORIGIN_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    active={mealOrigin === option.value}
                    onClick={() =>
                      setMealOrigin((current) => (current === option.value ? null : option.value))
                    }
                  />
                ))}
              </ContextGroup>

              {/* Sem "preparo do prato inteiro": preparo é POR ITEM (a IA devolve e o
                  usuário revisa). Aqui fica só um contexto textual opcional (Observações). */}
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

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(event) => setIsShared(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#f26a1b]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">Vou dividir esta porção</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                    A IA estima o prato inteiro — você ajusta a sua parte na revisão.
                  </span>
                </span>
              </label>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Observações <span className="ml-1 normal-case text-muted/70">(opcional)</span>
                </p>
                <input
                  type="text"
                  value={notes}
                  maxLength={200}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ex.: molho à parte, pouco arroz..."
                  className="mt-2 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted"
                />
              </div>
            </div>
          )}

          {/* ── 4. Processamento (análise real) ── */}
          {step === "processing" && (
            <div className="space-y-5">
              <div className="relative overflow-hidden rounded-2xl border border-border">
                <div
                  className="aspect-[4/3] w-full bg-surface-strong bg-cover bg-center"
                  style={photoUrl ? { backgroundImage: `url("${photoUrl}")` } : undefined}
                />
                <div className="dia-scanline" style={{ top: 0 }} />
              </div>

              <ul className="space-y-2.5">
                {PROCESSING_LABELS.map((label, index) => {
                  if (index > processingLabel) {
                    return null;
                  }

                  const isDone = index < processingLabel;

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

              <p className="text-[11px] leading-relaxed text-muted">
                A análise usa inteligência artificial e pode levar alguns segundos. Mantenha esta tela
                aberta.
              </p>
            </div>
          )}

          {/* ── Erro (falha ou foto rejeitada) ── */}
          {step === "error" && errorInfo && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-muted text-accent">
                <AlertTriangle size={26} strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">{errorInfo.title}</p>
                <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted">
                  {errorInfo.message}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(errorInfo.retake || errorInfo.retryable) && (
                  <button
                    type="button"
                    onClick={retryFromError}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
                  >
                    {errorInfo.retake ? <Camera size={16} /> : <RotateCcw size={16} />}
                    {errorInfo.retake ? "Tirar outra foto" : "Tentar de novo"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={exit}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-strong px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          {/* ── 5. Revisão (itens reais) ── */}
          {step === "review" && (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-muted">
                A IA estima, você confirma. Ajuste as gramas ou remova o que não está no prato — as
                calorias recalculam na hora.
              </p>

              {qualityNote && (
                <p className="flex gap-2 rounded-xl border border-accent/30 bg-accent-muted p-3 text-[11px] leading-relaxed text-accent">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  {qualityNote}
                </p>
              )}

              <ul className="space-y-3">
                {items.map((item) => {
                  const removed = removedIds.has(item.id);
                  const grams = gramsById[item.id] ?? itemGrams(item);
                  const macros = itemMacros(item, grams);
                  const maxGrams = Math.max(Math.round((grams * 2) / 5) * 5, 100);

                  return (
                    <li
                      key={item.id}
                      className={[
                        "rounded-xl border p-4 transition-opacity",
                        removed ? "border-dashed border-border bg-surface/50 opacity-60" : "border-border bg-surface",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={[
                              "truncate text-sm font-bold text-foreground",
                              removed ? "line-through" : "",
                            ].join(" ")}
                          >
                            {nameById[item.id] ?? item.name}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {item.preparation && (
                              <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                {item.preparation}
                              </span>
                            )}
                            {item.category && (
                              <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {item.category}
                              </span>
                            )}
                            {item.confidence !== null && <ConfidenceDot value={item.confidence} />}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-display text-base font-bold text-foreground">
                            {removed ? 0 : macros.kcal}
                            <span className="ml-0.5 text-[10px] font-medium text-muted">kcal</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRemoved(item.id)}
                            className={[
                              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                              removed
                                ? "text-accent hover:bg-surface-hover"
                                : "text-muted hover:bg-surface-hover hover:text-foreground",
                            ].join(" ")}
                            title={removed ? "Restaurar item" : "Remover item"}
                          >
                            {removed ? <RotateCcw size={15} /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </div>

                      {item.identification === "ambiguous" && item.alternatives.length > 0 && !removed && (
                        <div className="mt-3 rounded-lg border border-accent/30 bg-accent-muted/40 p-2.5">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                            <AlertTriangle size={12} /> Tipo incerto — confirme qual é:
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {[...item.alternatives, "Outro"].map((alt) => {
                              const chosen = nameById[item.id];
                              const isOutro = alt === "Outro";
                              const selected = isOutro ? chosen === item.name : chosen === alt;

                              return (
                                <button
                                  key={alt}
                                  type="button"
                                  onClick={() =>
                                    setNameById((current) => ({ ...current, [item.id]: isOutro ? item.name : alt }))
                                  }
                                  className={[
                                    "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                                    selected
                                      ? "border-accent bg-accent text-accent-on"
                                      : "border-border bg-surface text-muted-foreground hover:border-accent/40 hover:text-foreground",
                                  ].join(" ")}
                                >
                                  {alt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {!removed && (
                        <>
                          <div className="mt-3 flex items-center gap-3">
                            <input
                              type="range"
                              min={5}
                              max={maxGrams}
                              step={5}
                              value={grams}
                              onChange={(event) => updateGrams(item.id, Number(event.target.value))}
                              className="h-1.5 flex-1 cursor-pointer accent-[#f26a1b]"
                              aria-label={`Gramas de ${item.name}`}
                            />
                            <span className="w-14 shrink-0 text-right text-xs font-semibold text-foreground">
                              {grams} g
                            </span>
                          </div>

                          <p className="mt-2 text-[11px] text-muted">
                            P {macros.proteinG}g · C {macros.carbG}g · G {macros.fatG}g
                          </p>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Adição manual completa fica para depois do P1 (sem catálogo falso). */}
              <p className="flex gap-2 rounded-xl border border-border bg-surface p-4 text-[11px] leading-relaxed text-muted">
                <Lightbulb size={13} className="mt-0.5 shrink-0 text-accent" />
                Faltou algo que a IA não viu? A inclusão manual de alimentos chega numa próxima
                atualização. Por enquanto, ajuste as porções ou registre outra foto.
              </p>

              {reviewError && (
                <p className="text-[11px] font-medium text-accent" role="alert">
                  {reviewError}
                </p>
              )}

              {unresolvedAmbiguous && (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-accent" role="alert">
                  <AlertTriangle size={13} /> Escolha o tipo dos itens marcados como incertos para confirmar.
                </p>
              )}

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
                  disabled={activeItems.length === 0 || confirming || unresolvedAmbiguous}
                  onClick={() => void confirmMeal()}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {confirming ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-on/40 border-t-accent-on" />
                  ) : (
                    <Check size={16} strokeWidth={2.5} />
                  )}
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
                Registrado no seu diário
              </div>

              <button
                type="button"
                onClick={exit}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
              >
                Ver meu dia
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Rodapé de navegação — só nos passos de coleta (prep/foto/contexto) */}
        {(step === "prep" || step === "foto" || step === "contexto") && (
          <div className="flex items-center gap-2 border-t border-border px-5 py-4">
            {step === "prep" ? (
              <button
                type="button"
                onClick={exit}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-strong px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                Cancelar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step === "foto" ? "prep" : "foto")}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-strong px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>
            )}

            {step === "contexto" ? (
              <button
                type="button"
                onClick={() => void runAnalysis()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
              >
                <Sparkles size={16} />
                Analisar prato
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step === "prep" ? "foto" : "contexto")}
                disabled={step === "foto" && !file}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar
                <ArrowRight size={16} />
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
