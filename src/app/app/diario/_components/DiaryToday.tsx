"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Camera,
  Check,
  ChevronDown,
  Flame,
  Info,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  Zap,
} from "lucide-react";

import type { DiaryDay, DiaryMeal, MacroKey, MealType } from "../_mock/diaryMock";
import {
  MEAL_LABELS,
  QUICK_ACTIVITIES,
  SUGGESTED_TARGET_KCAL,
  anchorsLogged,
  buildDayInsights,
  dayBurned,
  dayConsumed,
  macroContributions,
  macroTargetsForKcal,
  mealTotals,
} from "../_mock/diaryMock";
import { DIARY_DISCLAIMER } from "../_content";
import { BalanceRing, useCountUp } from "./BalanceRing";
import { DayTrail, MealIcon } from "./bits";

type DiaryTodayProps = {
  day: DiaryDay;
  onStartMeal: (meal: MealType) => void;
  onRemoveMeal: (mealId: string) => void;
  onSetTarget: (kcal: number) => void;
  onAddActivity: (label: string, kcal: number) => void;
  onRemoveActivity: (activityId: string) => void;
  onSetBurnMode: (mode: "atividades" | "estimativa") => void;
  onSetEstimatedBurn: (kcal: number) => void;
};

export function DiaryToday(props: DiaryTodayProps) {
  const { day, onStartMeal } = props;
  const consumed = useMemo(() => dayConsumed(day), [day]);
  const burned = dayBurned(day);

  if (day.targetKcal === null) {
    return <TargetSetup onSetTarget={props.onSetTarget} />;
  }

  const targetKcal = day.targetKcal;
  const macroTargets = macroTargetsForKcal(targetKcal);
  const loggedMeals = new Set<MealType>(day.meals.map((meal) => meal.mealType));
  const kcalByMeal: Partial<Record<MealType, number>> = {};

  for (const meal of day.meals) {
    kcalByMeal[meal.mealType] = (kcalByMeal[meal.mealType] ?? 0) + mealTotals(meal).kcal;
  }

  const extrasCount = day.meals.filter((meal) => meal.mealType === "extra").length;

  return (
    <div className="space-y-6">
      {/* Hero: anel + métricas + macros */}
      <section className="dia-rise overflow-hidden rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr] sm:gap-8">
          <BalanceRing
            consumedKcal={consumed.kcal}
            targetKcal={targetKcal}
            burnedKcal={burned}
            burnReferenceKcal={Math.max(day.estimatedDailyBurn, 1)}
          />

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <StatCard label="Consumido" value={consumed.kcal} icon={Flame} tone="accent" />
              <StatCard label="Gasto" value={burned} icon={Zap} tone="success" />
              <StatCard label="Meta" value={targetKcal} icon={Target} tone="neutral" />
            </div>

            <MacroPanel day={day} consumedMacros={consumed} macroTargets={macroTargets} targetKcal={targetKcal} />
          </div>
        </div>
      </section>

      {/* Trilha do dia */}
      <section className="dia-rise rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Trilha do dia</h2>
          <p className="text-[11px] text-muted">
            {anchorsLogged(day)} de 4 refeições
            {extrasCount > 0 && (
              <span className="ml-1.5 rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">
                +{extrasCount} extra{extrasCount > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <DayTrail loggedMeals={loggedMeals} kcalByMeal={kcalByMeal} onPickMeal={onStartMeal} />
      </section>

      {/* CTA principal */}
      <button
        type="button"
        onClick={() => onStartMeal(suggestMeal())}
        className="dia-rise flex w-full items-center justify-center gap-2.5 rounded-2xl bg-accent px-6 py-4 text-sm font-bold text-accent-on shadow-[0_8px_30px_rgba(242,106,27,0.28)] transition-all hover:bg-accent-hover"
      >
        <Camera size={18} strokeWidth={2} />
        Registrar refeição com foto
      </button>

      {/* Refeições do dia */}
      <MealsSection meals={day.meals} onRemoveMeal={props.onRemoveMeal} />

      {/* Análise do dia */}
      {day.meals.length > 0 && <DayAnalysis day={day} />}

      {/* Gasto calórico */}
      <BurnSection
        day={day}
        onAddActivity={props.onAddActivity}
        onRemoveActivity={props.onRemoveActivity}
        onSetBurnMode={props.onSetBurnMode}
        onSetEstimatedBurn={props.onSetEstimatedBurn}
      />

      {/* Meta diária */}
      <TargetSection targetKcal={targetKcal} onSetTarget={props.onSetTarget} />

      <p className="text-[11px] leading-relaxed text-muted">{DIARY_DISCLAIMER}</p>
    </div>
  );
}

/* ─── Primeiro uso: definir meta ─────────────────────────────────────────────── */

function TargetSetup({ onSetTarget }: { onSetTarget: (kcal: number) => void }) {
  const [draft, setDraft] = useState("");
  const parsed = Number(draft);

  return (
    <section className="dia-rise overflow-hidden rounded-2xl border border-border bg-surface p-6 text-center sm:p-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-muted text-accent">
        <Target size={26} strokeWidth={1.8} />
      </div>
      <h2 className="mt-4 font-display text-xl font-bold text-foreground">Qual sua meta de hoje?</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
        Com uma meta, seu anel de balanço mostra em tempo real quanto ainda cabe no dia. Sugerimos um
        valor de referência — ajuste quando quiser.
      </p>

      <button
        type="button"
        onClick={() => onSetTarget(SUGGESTED_TARGET_KCAL)}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-accent-on shadow-[0_8px_30px_rgba(242,106,27,0.28)] transition-colors hover:bg-accent-hover"
      >
        <Zap size={16} strokeWidth={2} />
        Usar {SUGGESTED_TARGET_KCAL.toLocaleString("pt-BR")} kcal sugeridas
      </button>

      <div className="mx-auto mt-3 flex max-w-[240px] items-center gap-2">
        <input
          type="number"
          min={1}
          placeholder="Outra meta..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && parsed > 0) onSetTarget(Math.round(parsed));
          }}
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-center text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted"
          aria-label="Meta personalizada em kcal"
        />
        <button
          type="button"
          onClick={() => parsed > 0 && onSetTarget(Math.round(parsed))}
          disabled={!(parsed > 0)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-strong text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
          title="Definir meta"
        >
          <Check size={16} />
        </button>
      </div>

      <p className="mt-4 text-[11px] text-muted">
        No futuro, a sugestão poderá vir da sua TMB calculada no MoveScan.
      </p>
    </section>
  );
}

/* ─── Cartão de estatística ──────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  tone: "accent" | "success" | "neutral";
}) {
  const display = useCountUp(value);
  const toneClass =
    tone === "accent"
      ? "text-accent bg-accent-muted"
      : tone === "success"
        ? "text-success bg-success-soft"
        : "text-muted-foreground bg-surface-strong";

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon size={14} strokeWidth={1.8} />
      </div>
      <p className="mt-2 font-display text-lg font-bold tracking-tight text-foreground">
        {display.toLocaleString("pt-BR")}
        <span className="ml-1 text-[10px] font-medium text-muted">kcal</span>
      </p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}

/* ─── Painel de macros com drill-down ────────────────────────────────────────── */

function MacroPanel({
  day,
  consumedMacros,
  macroTargets,
  targetKcal,
}: {
  day: DiaryDay;
  consumedMacros: { proteinaG: number; carboG: number; gorduraG: number };
  macroTargets: { proteinaG: number; carboG: number; gorduraG: number };
  targetKcal: number;
}) {
  const [expanded, setExpanded] = useState<MacroKey | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const rows: Array<{ key: MacroKey; label: string; value: number; target: number; barClass: string }> = [
    { key: "proteinaG", label: "Proteínas", value: consumedMacros.proteinaG, target: macroTargets.proteinaG, barClass: "bg-success" },
    { key: "carboG", label: "Carboidratos", value: consumedMacros.carboG, target: macroTargets.carboG, barClass: "bg-accent" },
    { key: "gorduraG", label: "Gorduras", value: consumedMacros.gorduraG, target: macroTargets.gorduraG, barClass: "bg-muted/60" },
  ];

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Macros do dia</p>
        <button
          type="button"
          onClick={() => setShowInfo((current) => !current)}
          className={[
            "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
            showInfo ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground",
          ].join(" ")}
          title="De onde vêm esses alvos?"
        >
          <Info size={13} />
        </button>
      </div>

      {showInfo && (
        <p className="dia-rise rounded-lg bg-surface-strong/60 p-2.5 text-[11px] leading-relaxed text-muted">
          Alvos derivados da sua meta de {targetKcal.toLocaleString("pt-BR")} kcal (25% proteínas · 45%
          carboidratos · 30% gorduras). Toque em um macro para ver de quais alimentos ele veio.
        </p>
      )}

      {rows.map((row) => (
        <MacroRow
          key={row.key}
          label={row.label}
          valueG={row.value}
          targetG={row.target}
          barClass={row.barClass}
          contributions={macroContributions(day, row.key)}
          isOpen={expanded === row.key}
          onToggle={() => setExpanded((current) => (current === row.key ? null : row.key))}
        />
      ))}
    </div>
  );
}

function MacroRow({
  label,
  valueG,
  targetG,
  barClass,
  contributions,
  isOpen,
  onToggle,
}: {
  label: string;
  valueG: number;
  targetG: number;
  barClass: string;
  contributions: Array<{ nome: string; grams: number }>;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const percent = targetG > 0 ? Math.min((valueG / targetG) * 100, 100) : 0;
  const top = contributions.slice(0, 4);

  return (
    <div>
      <button type="button" onClick={onToggle} className="group block w-full text-left">
        <div className="flex items-baseline justify-between gap-2">
          <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            {label}
            <ChevronDown
              size={12}
              className={["text-muted transition-transform", isOpen ? "rotate-180" : ""].join(" ")}
            />
          </p>
          <p className="text-[11px] tabular-nums text-muted">
            <span className="font-bold text-foreground">{valueG.toLocaleString("pt-BR")}g</span> de {targetG}g
          </p>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-strong">
          <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${percent}%` }} />
        </div>
      </button>

      {isOpen && (
        <ul className="dia-rise mt-2 space-y-1.5 rounded-lg bg-surface-strong/60 p-2.5">
          {top.length === 0 && <li className="text-[11px] text-muted">Nenhum alimento ainda.</li>}
          {top.map((contribution) => {
            const share = valueG > 0 ? Math.min((contribution.grams / valueG) * 100, 100) : 0;

            return (
              <li key={contribution.nome} className="flex items-center gap-2">
                <span className="w-1/2 truncate text-[11px] text-muted-foreground">{contribution.nome}</span>
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface">
                  <span className={`block h-full rounded-full ${barClass}`} style={{ width: `${share}%` }} />
                </span>
                <span className="w-11 shrink-0 text-right text-[11px] font-semibold tabular-nums text-foreground">
                  {contribution.grams.toLocaleString("pt-BR")}g
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─── Refeições do dia ───────────────────────────────────────────────────────── */

function MealsSection({ meals, onRemoveMeal }: { meals: DiaryMeal[]; onRemoveMeal: (mealId: string) => void }) {
  return (
    <section className="dia-rise">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Refeições de hoje</h2>
      <ul className="mt-3 space-y-3">
        {meals.length === 0 && (
          <li className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">
            Nenhuma refeição registrada ainda. Fotografe seu prato para começar.
          </li>
        )}
        {meals.map((meal) => {
          const totals = mealTotals(meal);

          return (
            <li key={meal.id} className="dia-pop rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent">
                    <MealIcon meal={meal.mealType} size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {MEAL_LABELS[meal.mealType]}
                      <span className="ml-2 text-xs font-normal text-muted">{meal.loggedAtLabel}</span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {meal.itens.map((item) => item.nome).join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-display text-base font-bold text-foreground">
                    {totals.kcal}
                    <span className="ml-0.5 text-[10px] font-medium text-muted">kcal</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveMeal(meal.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                    title="Remover refeição"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-muted">
                P {totals.proteinaG}g · C {totals.carboG}g · G {totals.gorduraG}g
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ─── Análise do dia ─────────────────────────────────────────────────────────── */

function DayAnalysis({ day }: { day: DiaryDay }) {
  const [state, setState] = useState<"idle" | "processing" | "ready">("idle");
  const insights = useMemo(() => buildDayInsights(day), [day]);

  function generate() {
    setState("processing");
    window.setTimeout(() => setState("ready"), 1500);
  }

  return (
    <section className="dia-rise">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Análise do dia</h2>

      {state === "idle" && (
        <button
          type="button"
          onClick={generate}
          className="group mt-3 flex w-full items-center gap-4 rounded-2xl border border-accent/30 bg-surface p-5 text-left ring-1 ring-accent/10 transition-colors hover:bg-surface-hover"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-on">
            <Sparkles size={20} strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-foreground">Analisar meu dia</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted">
              Resumo do seu balanço e dicas do que ajustar nas próximas refeições.
            </span>
          </span>
        </button>
      )}

      {state === "processing" && (
        <div className="mt-3 space-y-3 rounded-2xl border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles size={16} className="animate-pulse text-accent" />
            Analisando seu dia...
          </p>
          <div className="dia-shimmer h-3.5 w-3/4 rounded-full" />
          <div className="dia-shimmer h-3.5 w-full rounded-full" />
          <div className="dia-shimmer h-3.5 w-2/3 rounded-full" />
        </div>
      )}

      {state === "ready" && (
        <div className="dia-pop mt-3 rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm font-semibold leading-relaxed text-foreground">{insights.headline}</p>
          <ul className="mt-3 space-y-2.5">
            {insights.tips.map((tip) => (
              <li key={tip} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {tip}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-[10px] leading-relaxed text-muted">
              Sugestões automáticas — não substituem seu personal ou nutricionista.
            </p>
            <button
              type="button"
              onClick={generate}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-strong px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <RotateCcw size={12} />
              Atualizar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ─── Gasto calórico ─────────────────────────────────────────────────────────── */

function BurnSection({
  day,
  onAddActivity,
  onRemoveActivity,
  onSetBurnMode,
  onSetEstimatedBurn,
}: {
  day: DiaryDay;
  onAddActivity: (label: string, kcal: number) => void;
  onRemoveActivity: (activityId: string) => void;
  onSetBurnMode: (mode: "atividades" | "estimativa") => void;
  onSetEstimatedBurn: (kcal: number) => void;
}) {
  const [label, setLabel] = useState("");
  const [kcal, setKcal] = useState("");

  function addCustom() {
    const value = Number(kcal);

    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    onAddActivity(label.trim() || "Atividade", Math.round(value));
    setLabel("");
    setKcal("");
  }

  return (
    <section className="dia-rise">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Gasto calórico</h2>
        <div className="flex rounded-lg border border-border bg-surface p-0.5 text-[11px] font-semibold">
          {(["atividades", "estimativa"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSetBurnMode(mode)}
              className={[
                "rounded-md px-2.5 py-1 transition-colors",
                day.burnMode === mode ? "bg-accent text-accent-on" : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              {mode === "atividades" ? "Por atividade" : "Estimativa do dia"}
            </button>
          ))}
        </div>
      </div>

      {day.burnMode === "estimativa" ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
            <Zap size={18} strokeWidth={1.8} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Gasto estimado de hoje</p>
            <p className="text-xs text-muted">Um valor único para o dia inteiro</p>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              value={day.estimatedDailyBurn}
              onChange={(event) => onSetEstimatedBurn(Math.max(Number(event.target.value) || 0, 0))}
              className="h-10 w-24 rounded-lg border border-border bg-background px-3 text-right text-sm font-semibold text-foreground"
              aria-label="Gasto estimado do dia em kcal"
            />
            <span className="text-xs text-muted">kcal</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIVITIES.map((activity) => (
              <button
                key={activity.label}
                type="button"
                onClick={() => onAddActivity(activity.label, activity.kcal)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-success/50 hover:text-foreground"
              >
                <Plus size={13} />
                {activity.label}
                <span className="font-bold text-success">+{activity.kcal}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Outra atividade..."
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted"
            />
            <input
              type="number"
              placeholder="kcal"
              min={0}
              value={kcal}
              onChange={(event) => setKcal(event.target.value)}
              className="h-10 w-20 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted"
            />
            <button
              type="button"
              onClick={addCustom}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-strong text-foreground transition-colors hover:bg-surface-hover"
              title="Adicionar atividade"
            >
              <Check size={16} />
            </button>
          </div>

          {day.activities.length > 0 && (
            <ul className="space-y-2">
              {day.activities.map((activity) => (
                <li
                  key={activity.id}
                  className="dia-pop flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
                      <Activity size={15} strokeWidth={1.8} />
                    </span>
                    <p className="truncate text-sm font-medium text-foreground">{activity.label}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold text-success">+{activity.kcal} kcal</span>
                    <button
                      type="button"
                      onClick={() => onRemoveActivity(activity.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                      title="Remover atividade"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

/* ─── Meta diária (editar) ───────────────────────────────────────────────────── */

function TargetSection({ targetKcal, onSetTarget }: { targetKcal: number; onSetTarget: (kcal: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(targetKcal));

  function save() {
    const parsed = Number(draft);

    if (Number.isFinite(parsed) && parsed > 0) {
      onSetTarget(Math.round(parsed));
    }

    setEditing(false);
  }

  return (
    <section className="dia-rise">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Meta diária</h2>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent">
          <Target size={18} strokeWidth={1.8} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Consumo alvo</p>
          <p className="text-xs text-muted">No futuro pode vir da sua TMB (MoveScan)</p>
        </div>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") save();
              }}
              className="h-10 w-24 rounded-lg border border-border bg-background px-3 text-right text-sm font-semibold text-foreground"
              aria-label="Meta diária em kcal"
            />
            <button
              type="button"
              onClick={save}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-on transition-colors hover:bg-accent-hover"
              title="Salvar meta"
            >
              <Check size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(String(targetKcal));
              setEditing(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-strong px-3.5 py-2 text-sm font-bold text-foreground transition-colors hover:bg-surface-hover"
          >
            {targetKcal.toLocaleString("pt-BR")} kcal
            <Pencil size={13} className="text-muted" />
          </button>
        )}
      </div>
    </section>
  );
}

function suggestMeal(): MealType {
  return "almoco";
}
