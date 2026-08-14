import type { FoodDiaryHud } from "@/bff/modules/foodDiary/types/plan";

/**
 * Headline do card do Diário na Home — MESMA regra 2.1 do HUD (pura e testável).
 * Nunca usa kcalToBandTop como manchete em "below".
 *  • below : bandLow − consumido → "X kcal para entrar na sua faixa"
 *  • within: "Você está dentro da sua faixa" (sem número)
 *  • above : consumido − bandHigh → "X kcal acima da sua faixa"
 */
export type HomeHeadline = {
  kind: "below" | "within" | "above";
  /** Número da manchete (null em within). */
  value: number | null;
  label: string;
};

export function homeHeadline(hud: FoodDiaryHud): HomeHeadline {
  if (hud.status === "above") {
    return { kind: "above", value: hud.kcalOverBandTop, label: "kcal acima da sua faixa" };
  }

  if (hud.status === "within") {
    return { kind: "within", value: null, label: "Você está dentro da sua faixa" };
  }

  const toEnter = Math.max(hud.bandLowKcal - hud.consumedKcal, 0);
  return { kind: "below", value: toEnter, label: "kcal para entrar na sua faixa" };
}
