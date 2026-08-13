import type { FoodDiaryItemAlternative, FoodDiaryItemView } from "@/bff/modules/foodDiary/types";

/**
 * Resolução de identidade no review (compartilhada entre MealReview e MealWizard).
 *
 * Um item ambíguo/desconhecido precisa de escolha antes de confirmar. A escolha é
 * COERENTE: um candidato troca nome E nutrientes (perfil completo, sem 2ª chamada de
 * IA); "keep" mantém a estimativa da IA, apenas marcando a identidade como resolvida.
 * O preview usa exatamente o candidato escolhido — é o que o backend vai persistir.
 */
export type ItemResolution =
  | { kind: "keep" }
  | { kind: "alternative"; alt: FoodDiaryItemAlternative };

/** Itens cuja identidade a IA não fechou — exigem resolução do usuário. */
export function needsResolution(item: FoodDiaryItemView): boolean {
  return item.identification === "ambiguous" || item.identification === "unknown";
}

/** Item efetivo após a resolução — troca nome + macros pelo candidato escolhido. */
export function resolvedView(
  item: FoodDiaryItemView,
  resolution: ItemResolution | undefined,
): FoodDiaryItemView {
  if (!resolution || resolution.kind === "keep") {
    return item;
  }

  const { alt } = resolution;

  return {
    ...item,
    name: alt.name,
    kcalPer100g: alt.kcalPer100g,
    proteinPer100g: alt.proteinPer100g,
    carbPer100g: alt.carbPer100g,
    fatPer100g: alt.fatPer100g,
    fiberPer100g: alt.fiberPer100g,
    identification: "identified",
  };
}

/** Campos do review PATCH para uma resolução (vazio quando não há escolha a enviar). */
export function resolutionEdit(resolution: ItemResolution | undefined): {
  identification?: "identified";
  name?: string;
  kcalPer100g?: number;
  proteinPer100g?: number;
  carbPer100g?: number;
  fatPer100g?: number;
  fiberPer100g?: number | null;
} {
  if (!resolution) {
    return {};
  }

  if (resolution.kind === "keep") {
    // Mantém a estimativa da IA; só marca a identidade como resolvida.
    return { identification: "identified" };
  }

  const { alt } = resolution;

  return {
    identification: "identified",
    name: alt.name,
    kcalPer100g: alt.kcalPer100g,
    proteinPer100g: alt.proteinPer100g,
    carbPer100g: alt.carbPer100g,
    fatPer100g: alt.fatPer100g,
    fiberPer100g: alt.fiberPer100g,
  };
}
