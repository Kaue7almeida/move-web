"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Lightbulb, RotateCcw, Trash2 } from "lucide-react";

import type { FoodDiaryItemView } from "@/bff/modules/foodDiary/types";
import { confirmEntry, reviewEntry } from "@/services/foodDiary/foodDiaryService";

import { describeFoodDiaryError } from "../_errors";
import { itemGrams, itemMacros, sumMacros } from "../_nutrition";
import { type ItemResolution, needsResolution, resolutionEdit, resolvedView } from "../_review";
import { useCountUp } from "./BalanceRing";

/**
 * Revisão compartilhada de itens (foto / texto / docinho convergem aqui). Mantém:
 *  • gramas editáveis (preview ao vivo, sem round-trip por tecla);
 *  • remover/restaurar;
 *  • resolução de AMBIGUIDADE — escolher um candidato troca nome E nutrientes de forma
 *    coerente (o preview reflete exatamente o que será salvo); exigida antes de confirmar;
 *  • preparation por item (exibida).
 * PATCH em lote → confirm; o backend é a fonte da verdade do total.
 */
export function MealReview({
  entryId,
  items,
  qualityOverall,
  confirmLabel = "Confirmar refeição",
  onConfirmed,
}: {
  entryId: string;
  items: FoodDiaryItemView[];
  qualityOverall: string | null;
  confirmLabel?: string;
  onConfirmed: (confirmedKcal: number) => void;
}) {
  const [gramsById, setGramsById] = useState<Record<string, number>>(() => initGrams(items));
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [resolutionById, setResolutionById] = useState<Record<string, ItemResolution>>({});
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeItems = useMemo(
    () => items.filter((item) => !removedIds.has(item.id)),
    [items, removedIds],
  );
  const totals = useMemo(
    () =>
      sumMacros(
        activeItems.map((item) =>
          itemMacros(resolvedView(item, resolutionById[item.id]), gramsById[item.id] ?? itemGrams(item)),
        ),
      ),
    [activeItems, gramsById, resolutionById],
  );
  const reviewKcal = useCountUp(totals.kcal, 450);
  // Backend is the last barrier, but block confirm in the UI too: every ambiguous/unknown
  // active item must be resolved (pick a candidate or keep the estimate) first.
  const hasUnresolved = useMemo(
    () => activeItems.some((item) => needsResolution(item) && !(item.id in resolutionById)),
    [activeItems, resolutionById],
  );

  const qualityNote =
    qualityOverall === "media"
      ? "A estimativa saiu de qualidade média — confira com atenção."
      : qualityOverall === "ruim"
        ? "A estimativa saiu de qualidade baixa — os valores podem estar imprecisos."
        : null;

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

  async function confirm() {
    if (activeItems.length === 0 || confirming || hasUnresolved) {
      return;
    }

    setConfirming(true);
    setError(null);

    try {
      await reviewEntry(entryId, {
        items: items.map((item) => ({
          id: item.id,
          gramsConfirmed: gramsById[item.id] ?? itemGrams(item),
          isRemoved: removedIds.has(item.id),
          ...resolutionEdit(resolutionById[item.id]),
        })),
      });

      const confirmed = await confirmEntry(entryId);
      onConfirmed(confirmed.entry.confirmedTotals.kcal ?? totals.kcal);
    } catch (caught) {
      setError(describeFoodDiaryError(caught).message);
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted">
        A IA estima, você confirma. Ajuste as gramas ou remova o que não está certo — as calorias
        recalculam na hora.
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
          const resolution = resolutionById[item.id];
          const view = resolvedView(item, resolution);
          const grams = gramsById[item.id] ?? itemGrams(item);
          const macros = itemMacros(view, grams);
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
                  <p className={["truncate text-sm font-bold text-foreground", removed ? "line-through" : ""].join(" ")}>
                    {view.name}
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
                      removed ? "text-accent hover:bg-surface-hover" : "text-muted hover:bg-surface-hover hover:text-foreground",
                    ].join(" ")}
                    title={removed ? "Restaurar item" : "Remover item"}
                  >
                    {removed ? <RotateCcw size={15} /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>

              {needsResolution(item) && !removed && (
                <div className="mt-3 rounded-lg border border-accent/30 bg-accent-muted/40 p-2.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                    <AlertTriangle size={12} />
                    {item.identification === "unknown"
                      ? "Não identifiquei com certeza — confirme:"
                      : "Tipo incerto — escolha qual é (muda as calorias):"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.alternatives.map((alt) => {
                      const selected = resolution?.kind === "alternative" && resolution.alt.name === alt.name;

                      return (
                        <button
                          key={alt.name}
                          type="button"
                          onClick={() =>
                            setResolutionById((current) => ({ ...current, [item.id]: { kind: "alternative", alt } }))
                          }
                          className={[
                            "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                            selected
                              ? "border-accent bg-accent text-accent-on"
                              : "border-border bg-surface text-muted-foreground hover:border-accent/40 hover:text-foreground",
                          ].join(" ")}
                        >
                          {alt.name}
                          <span className={selected ? "ml-1 opacity-80" : "ml-1 text-muted"}>
                            {Math.round(alt.kcalPer100g)} kcal/100g
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setResolutionById((current) => ({ ...current, [item.id]: { kind: "keep" } }))}
                      className={[
                        "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                        resolution?.kind === "keep"
                          ? "border-accent bg-accent text-accent-on"
                          : "border-border bg-surface text-muted-foreground hover:border-accent/40 hover:text-foreground",
                      ].join(" ")}
                    >
                      {item.identification === "unknown" ? "Manter estimativa" : "Outro / manter"}
                    </button>
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
                    <span className="w-14 shrink-0 text-right text-xs font-semibold text-foreground">{grams} g</span>
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

      <p className="flex gap-2 rounded-xl border border-border bg-surface p-4 text-[11px] leading-relaxed text-muted">
        <Lightbulb size={13} className="mt-0.5 shrink-0 text-accent" />
        Faltou algo? A inclusão manual de alimentos chega numa próxima atualização. Por enquanto,
        ajuste as porções.
      </p>

      {hasUnresolved && (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-accent" role="alert">
          <AlertTriangle size={13} /> Escolha o tipo dos itens marcados como incertos para confirmar.
        </p>
      )}

      {error && (
        <p className="text-[11px] font-medium text-accent" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Total</p>
          <p className="font-display text-2xl font-bold text-foreground">
            {reviewKcal.toLocaleString("pt-BR")} <span className="text-sm font-medium text-muted">kcal</span>
          </p>
        </div>
        <button
          type="button"
          disabled={activeItems.length === 0 || confirming || hasUnresolved}
          onClick={() => void confirm()}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {confirming && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-on/40 border-t-accent-on" />
          )}
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

function initGrams(items: FoodDiaryItemView[]): Record<string, number> {
  const grams: Record<string, number> = {};
  for (const item of items) {
    grams[item.id] = itemGrams(item);
  }
  return grams;
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
