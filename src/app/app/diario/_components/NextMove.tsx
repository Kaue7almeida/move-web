"use client";

import { Check, Egg, Moon, Sparkles, Utensils } from "lucide-react";

import type { FoodDiaryTodayResponse } from "@/bff/modules/foodDiary/types";
import type { FoodDiaryHud } from "@/bff/modules/foodDiary/types/plan";

import { computeNextMove, type MoveIconKey } from "./nextMoveLogic";

type IconComp = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const ICONS: Record<MoveIconKey, IconComp> = {
  utensils: Utensils,
  check: Check,
  moon: Moon,
  egg: Egg,
};

/**
 * "Próximo movimento" — UMA recomendação principal e, no máximo, uma secundária.
 * Responde "o que faz sentido fazer agora?", não parece relatório. A decisão é
 * determinística e vive em nextMoveLogic.ts (testável); aqui só apresentamos.
 */
export function NextMove({ today, hud }: { today: FoodDiaryTodayResponse; hud: FoodDiaryHud }) {
  const { primary, secondary } = computeNextMove(today, hud);
  const PrimaryIcon = ICONS[primary.iconKey];
  const SecondaryIcon = secondary ? ICONS[secondary.iconKey] : null;

  return (
    <section className="dia-rise rounded-2xl border border-accent/25 bg-accent-muted/25 p-4 sm:p-5">
      <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-accent">
        <Sparkles size={14} /> Próximo movimento
      </p>

      <div className="mt-3 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-on">
          <PrimaryIcon size={19} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-snug text-foreground">{primary.title}</p>
          {primary.detail && (
            <p className="mt-0.5 text-[14px] leading-snug text-muted-foreground">{primary.detail}</p>
          )}
        </div>
      </div>

      {secondary && SecondaryIcon && (
        <div className="mt-3 flex items-center gap-2.5 border-t border-accent/15 pt-3">
          <SecondaryIcon size={15} className="shrink-0 text-muted" />
          <p className="text-[13px] leading-snug text-muted-foreground">
            <span className="font-semibold text-foreground">{secondary.title}</span>
            {secondary.detail ? ` · ${secondary.detail}` : ""}
          </p>
        </div>
      )}
    </section>
  );
}
