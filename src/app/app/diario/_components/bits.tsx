"use client";

import { Coffee, Cookie, Moon, Sparkles, Utensils } from "lucide-react";

import type { MealType } from "../_mock/diaryMock";
import { MEAL_ANCHORS, MEAL_LABELS } from "../_mock/diaryMock";

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

/* ─── Prato de exemplo (SVG ilustrado, sem asset externo) ────────────────────── */

export function ExamplePlate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label="Prato de exemplo">
      <defs>
        <radialGradient id="dia-bg" cx="50%" cy="42%" r="75%">
          <stop offset="0%" stopColor="#2a2320" />
          <stop offset="100%" stopColor="#171310" />
        </radialGradient>
        <radialGradient id="dia-plate" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#f4efe8" />
          <stop offset="82%" stopColor="#e4dcd2" />
          <stop offset="100%" stopColor="#c9beb1" />
        </radialGradient>
      </defs>

      <rect width="400" height="300" fill="url(#dia-bg)" />

      {/* talher de referência ao lado do prato */}
      <g transform="translate(354 76) rotate(8)">
        <rect x="-4" y="0" width="8" height="120" rx="4" fill="#8b8378" />
        <rect x="-10" y="-26" width="5" height="30" rx="2.5" fill="#8b8378" />
        <rect x="-2.5" y="-28" width="5" height="32" rx="2.5" fill="#8b8378" />
        <rect x="5" y="-26" width="5" height="30" rx="2.5" fill="#8b8378" />
      </g>

      <ellipse cx="192" cy="152" rx="162" ry="126" fill="url(#dia-plate)" />
      <ellipse cx="192" cy="152" rx="132" ry="100" fill="none" stroke="#b6a998" strokeWidth="2" opacity="0.55" />

      {/* arroz */}
      <g fill="#f7f3ea">
        <ellipse cx="122" cy="128" rx="62" ry="42" />
        <ellipse cx="100" cy="112" rx="10" ry="5" fill="#fffdf7" />
        <ellipse cx="146" cy="118" rx="10" ry="5" fill="#fffdf7" />
        <ellipse cx="110" cy="146" rx="8" ry="4" fill="#efe9da" />
      </g>

      {/* feijão */}
      <g>
        <ellipse cx="132" cy="196" rx="54" ry="32" fill="#5a3b2a" />
        <ellipse cx="132" cy="192" rx="50" ry="27" fill="#6d4732" />
        <ellipse cx="116" cy="188" rx="9" ry="5.5" fill="#8a5a3e" />
        <ellipse cx="156" cy="186" rx="8" ry="5" fill="#8a5a3e" />
      </g>

      {/* frango grelhado */}
      <g transform="rotate(-14 262 148)">
        <ellipse cx="262" cy="148" rx="58" ry="34" fill="#c98a4b" />
        <ellipse cx="262" cy="144" rx="54" ry="29" fill="#daa05f" />
        <rect x="222" y="132" width="80" height="4" rx="2" fill="#a86a35" opacity="0.85" />
        <rect x="232" y="160" width="62" height="4" rx="2" fill="#a86a35" opacity="0.55" />
      </g>

      {/* salada */}
      <g>
        <ellipse cx="228" cy="86" rx="46" ry="24" fill="#3e7a3a" />
        <ellipse cx="212" cy="80" rx="16" ry="9" fill="#569b4c" />
        <circle cx="252" cy="78" r="8" fill="#c8442e" />
        <circle cx="206" cy="94" r="7" fill="#c8442e" />
      </g>

      {/* farofa */}
      <g>
        <ellipse cx="252" cy="204" rx="38" ry="22" fill="#caa050" />
        <circle cx="240" cy="198" r="3" fill="#e0bc70" />
        <circle cx="266" cy="196" r="2.5" fill="#e0bc70" />
      </g>
    </svg>
  );
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
