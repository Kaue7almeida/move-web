import type { FoodDiaryEntryView, FoodDiaryItemView } from "@/bff/modules/foodDiary/types";

/**
 * Cálculo nutricional do front — espelha exatamente a regra do backend
 * (gramas × valor por 100 g; kcal já vem recomputada do backend via Atwater).
 * Serve para o preview ao vivo da revisão (sem round-trip por tecla) e para o
 * detalhamento de macros por alimento. NÃO é fonte da verdade: o total salvo é
 * sempre o que o backend retorna após confirmar.
 */

export type MacroKey = "proteinG" | "carbG" | "fatG";

export type ItemMacros = {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};

const ZERO_MACROS: ItemMacros = { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 };

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Gramas em vigor para o item: o confirmado pelo usuário, senão o estimado pela IA. */
export function itemGrams(item: FoodDiaryItemView): number {
  return item.gramsConfirmed ?? item.gramsEstimated;
}

/** Macros de um item para uma quantidade de gramas (default: as gramas em vigor). */
export function itemMacros(item: FoodDiaryItemView, grams: number = itemGrams(item)): ItemMacros {
  const factor = grams / 100;

  return {
    kcal: Math.round(item.kcalPer100g * factor),
    proteinG: round1(item.proteinPer100g * factor),
    carbG: round1(item.carbPer100g * factor),
    fatG: round1(item.fatPer100g * factor),
  };
}

export function sumMacros(list: ItemMacros[]): ItemMacros {
  return list.reduce<ItemMacros>(
    (acc, macros) => ({
      kcal: acc.kcal + macros.kcal,
      proteinG: round1(acc.proteinG + macros.proteinG),
      carbG: round1(acc.carbG + macros.carbG),
      fatG: round1(acc.fatG + macros.fatG),
    }),
    { ...ZERO_MACROS },
  );
}

/** Split padrão 25% proteína / 45% carboidrato / 30% gordura (4-4-9 kcal/g). */
export function macroTargetsForKcal(targetKcal: number): { proteinG: number; carbG: number; fatG: number } {
  return {
    proteinG: Math.round((targetKcal * 0.25) / 4),
    carbG: Math.round((targetKcal * 0.45) / 4),
    fatG: Math.round((targetKcal * 0.3) / 9),
  };
}

export type MacroContribution = { name: string; grams: number };

/**
 * Agrega, por alimento, quanto cada um contribuiu para um macro no conjunto de
 * refeições (ignora itens removidos). Ordenado do maior para o menor.
 */
export function macroContributions(meals: FoodDiaryEntryView[], macro: MacroKey): MacroContribution[] {
  const byName = new Map<string, MacroContribution>();

  for (const meal of meals) {
    for (const item of meal.items) {
      if (item.isRemoved) {
        continue;
      }

      const grams = itemMacros(item)[macro];

      if (grams <= 0) {
        continue;
      }

      const existing = byName.get(item.name);

      if (existing) {
        existing.grams = round1(existing.grams + grams);
      } else {
        byName.set(item.name, { name: item.name, grams });
      }
    }
  }

  return [...byName.values()].sort((left, right) => right.grams - left.grams);
}

/** kcal confirmado de uma refeição já confirmada, com fallback para o estimado. */
export function mealKcal(meal: FoodDiaryEntryView): number {
  return meal.confirmedTotals.kcal ?? meal.estimatedTotals.kcal ?? 0;
}
