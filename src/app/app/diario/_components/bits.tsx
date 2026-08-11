"use client";

import { Coffee, Cookie, Moon, Sparkles, Utensils } from "lucide-react";

import type { MealType } from "@/bff/modules/foodDiary/types";

import { MEAL_ANCHORS, MEAL_LABELS } from "../_content";

/* ─── Ícone por refeição ─────────────────────────────────────────────────────── */

export function MealIcon({ meal, size = 18 }: { meal: MealType; size?: number }) {
  const props = { size, strokeWidth: 1.8 };

  switch (meal) {
    case "cafe_da_manha":
      return <Coffee {...props} />;
    case "almoco":
      return <Utensils {...props} />;
    case "lanche":
      return <Cookie {...props} />;
    case "jantar":
      return <Moon {...props} />;
    case "extra":
      return <Sparkles {...props} />;
  }
}

/* ─── Trilha do dia (checkpoints de refeição) ────────────────────────────────── */

export function DayTrail({
  loggedMeals,
  kcalByMeal,
  onPickMeal,
}: {
  loggedMeals: Set<MealType>;
  kcalByMeal: Partial<Record<MealType, number>>;
  onPickMeal: (meal: MealType) => void;
}) {
  const lastLoggedIndex = MEAL_ANCHORS.reduce(
    (acc, meal, index) => (loggedMeals.has(meal) ? index : acc),
    -1,
  );
  const fillPercent =
    lastLoggedIndex < 0 ? 0 : (lastLoggedIndex / (MEAL_ANCHORS.length - 1)) * 100;

  return (
    <div className="relative px-2 pb-1 pt-5">
      <div className="absolute left-[12%] right-[12%] top-[38px] h-1 rounded-full bg-surface-strong" />
      <div
        className="absolute left-[12%] top-[38px] h-1 rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500"
        style={{ width: `calc(${fillPercent} * (100% - 24%) / 100)` }}
      />

      <div className="relative flex items-start justify-between">
        {MEAL_ANCHORS.map((meal) => {
          const isLogged = loggedMeals.has(meal);
          const kcal = kcalByMeal[meal];

          return (
            <button
              key={meal}
              type="button"
              onClick={() => onPickMeal(meal)}
              className="group flex w-1/4 flex-col items-center gap-1.5"
              title={
                isLogged
                  ? `${MEAL_LABELS[meal]} · ${kcal} kcal`
                  : `Registrar ${MEAL_LABELS[meal].toLowerCase()}`
              }
            >
              <span
                className={[
                  "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all",
                  isLogged
                    ? "border-accent bg-accent text-accent-on shadow-[0_0_16px_rgba(242,106,27,0.35)]"
                    : "border-border-strong bg-surface text-muted group-hover:border-accent/50 group-hover:text-accent",
                ].join(" ")}
              >
                <MealIcon meal={meal} size={18} />
              </span>
              <span
                className={[
                  "text-[10px] font-semibold leading-none",
                  isLogged ? "text-foreground" : "text-muted",
                ].join(" ")}
              >
                {MEAL_LABELS[meal]}
              </span>
              <span className="text-[10px] leading-none text-muted">
                {isLogged ? `${kcal} kcal` : "—"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
