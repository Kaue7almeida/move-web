"use client";

import { useState } from "react";
import {
  Activity,
  Camera,
  Check,
  ChevronDown,
  Flame,
  Info,
  Loader2,
  Pencil,
  Plus,
  Target,
  Trash2,
  Zap,
} from "lucide-react";

import type {
  ActivityEnergyView,
  FoodDiaryEntryView,
  FoodDiaryTodayResponse,
  MealType,
} from "@/bff/modules/foodDiary/types";
import type { FoodDiaryHud } from "@/bff/modules/foodDiary/types/plan";
import { addActivity, deleteEntry, removeActivity, upsertTarget } from "@/services/foodDiary/foodDiaryService";

import { DIARY_DISCLAIMER, MEAL_LABELS, QUICK_ACTIVITIES, SUGGESTED_TARGET_KCAL } from "../_content";
import { describeFoodDiaryError } from "../_errors";
import {
  macroContributions,
  macroTargetsForKcal,
  mealKcal,
  type MacroKey,
} from "../_nutrition";
import { BalanceRing, useCountUp } from "./BalanceRing";
import { DayTrail, MealIcon } from "./bits";

type DiaryTodayProps = {
  today: FoodDiaryTodayResponse;
  onStartMeal: (meal: MealType) => void;
  /** Re-busca o dia após uma mutação (a página é a fonte de verdade). */
  onRefresh: () => void;
  /**
   * When a plan/HUD is active (Diário 2.0), the page renders the HUD above and
   * this component drops its legacy target-based hero + target editor — showing
   * only the day management (trilha, refeições, atividades).
   */
  hud?: FoodDiaryHud | null;
};

export function DiaryToday({ today, onStartMeal, onRefresh, hud = null }: DiaryTodayProps) {
  const { totals, meals, activities } = today;

  // Ações reais: cada mutação chama o BFF e, ao concluir, dispara onRefresh().
  const setTarget = async (kcal: number) => {
    await upsertTarget({ targetKcal: kcal });
    onRefresh();
  };

  // Legacy first-use (no plan and no target): keep the simple target setup.
  if (today.target === null && !hud) {
    return <TargetSetup onSetTarget={setTarget} />;
  }

  const targetKcal = today.target?.targetKcal ?? hud?.alvoCentralKcal ?? 0;
  const macroTargets = macroTargetsForKcal(targetKcal);
  const consumedMacros = {
    proteinG: totals.consumedProteinG,
    carbG: totals.consumedCarbG,
    fatG: totals.consumedFatG,
  };

  const loggedMeals = new Set<MealType>(meals.map((meal) => meal.mealType as MealType));
  const kcalByMeal: Partial<Record<MealType, number>> = {};

  for (const meal of meals) {
    const type = meal.mealType as MealType;
    kcalByMeal[type] = (kcalByMeal[type] ?? 0) + mealKcal(meal);
  }

  const anchorsLogged = new Set(
    meals.filter((meal) => meal.mealType !== "extra").map((meal) => meal.mealType),
  ).size;
  const extrasCount = meals.filter((meal) => meal.mealType === "extra").length;

  return (
    <div className="space-y-6">
      {/* Hero legado (anel + métricas + macros) — só sem HUD 2.0 (o HUD cobre isso) */}
      {!hud && (
      <section className="dia-rise overflow-hidden rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr] sm:gap-8">
          <BalanceRing
            consumedKcal={totals.consumedKcal}
            targetKcal={targetKcal}
            burnedKcal={totals.burnedKcal}
            burnReferenceKcal={Math.max(totals.burnedKcal, 1)}
          />

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <StatCard label="Consumido" value={totals.consumedKcal} icon={Flame} tone="accent" />
              <StatCard label="Gasto" value={totals.burnedKcal} icon={Zap} tone="success" />
              <StatCard label="Meta" value={targetKcal} icon={Target} tone="neutral" />
            </div>

            <MacroPanel
              meals={meals}
              consumedMacros={consumedMacros}
              macroTargets={macroTargets}
              targetKcal={targetKcal}
            />
          </div>
        </div>
      </section>
      )}

      {/* Trilha do dia */}
      <section className="dia-rise rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Trilha do dia</h2>
          <p className="text-[11px] text-muted">
            {anchorsLogged} de 4 refeições
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
        onClick={() => onStartMeal(suggestMealByHour())}
        className="dia-rise flex w-full items-center justify-center gap-2.5 rounded-2xl bg-accent px-6 py-4 text-sm font-bold text-accent-on shadow-[0_8px_30px_rgba(242,106,27,0.28)] transition-all hover:bg-accent-hover"
      >
        <Camera size={18} strokeWidth={2} />
        Registrar refeição com foto
      </button>

      {/* Refeições do dia */}
      <MealsSection
        meals={meals}
        onRemoveMeal={async (id) => {
          await deleteEntry(id);
          onRefresh();
        }}
      />

      {/* Gasto calórico (atividades reais) */}
      <BurnSection
        activities={activities}
        onAddActivity={async (label, kcal) => {
          await addActivity({ label, kcalBurned: kcal });
          onRefresh();
        }}
        onRemoveActivity={async (id) => {
          await removeActivity(id);
          onRefresh();
        }}
      />

      {/* Meta diária (legado) — só sem HUD 2.0 (o plano define a faixa) */}
      {!hud && <TargetSection targetKcal={targetKcal} onSetTarget={setTarget} />}

      <p className="text-[11px] leading-relaxed text-muted">{DIARY_DISCLAIMER}</p>
    </div>
  );
}

/* ─── Erro inline reutilizável ───────────────────────────────────────────────── */

function InlineError({ message }: { message: string }) {
  return (
    <p className="mt-2 text-[11px] font-medium text-accent" role="alert">
      {message}
    </p>
  );
}

/* ─── Primeiro uso: definir meta ─────────────────────────────────────────────── */

function TargetSetup({ onSetTarget }: { onSetTarget: (kcal: number) => Promise<void> }) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsed = Number(draft);

  async function commit(kcal: number) {
    if (!(kcal > 0) || pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      await onSetTarget(Math.round(kcal));
    } catch (caught) {
      setError(describeFoodDiaryError(caught).message);
      setPending(false);
    }
  }

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
        onClick={() => void commit(SUGGESTED_TARGET_KCAL)}
        disabled={pending}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-accent-on shadow-[0_8px_30px_rgba(242,106,27,0.28)] transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} strokeWidth={2} />}
        Usar {SUGGESTED_TARGET_KCAL.toLocaleString("pt-BR")} kcal sugeridas
      </button>

      <div className="mx-auto mt-3 flex max-w-[240px] items-center gap-2">
        <input
          type="number"
          min={1}
          placeholder="Outra meta..."
          value={draft}
          disabled={pending}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void commit(parsed);
          }}
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-center text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted"
          aria-label="Meta personalizada em kcal"
        />
        <button
          type="button"
          onClick={() => void commit(parsed)}
          disabled={pending || !(parsed > 0)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-strong text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
          title="Definir meta"
        >
          <Check size={16} />
        </button>
      </div>

      {error && <InlineError message={error} />}

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
  meals,
  consumedMacros,
  macroTargets,
  targetKcal,
}: {
  meals: FoodDiaryEntryView[];
  consumedMacros: { proteinG: number; carbG: number; fatG: number };
  macroTargets: { proteinG: number; carbG: number; fatG: number };
  targetKcal: number;
}) {
  const [expanded, setExpanded] = useState<MacroKey | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const rows: Array<{ key: MacroKey; label: string; value: number; target: number; barClass: string }> = [
    { key: "proteinG", label: "Proteínas", value: consumedMacros.proteinG, target: macroTargets.proteinG, barClass: "bg-success" },
    { key: "carbG", label: "Carboidratos", value: consumedMacros.carbG, target: macroTargets.carbG, barClass: "bg-accent" },
    { key: "fatG", label: "Gorduras", value: consumedMacros.fatG, target: macroTargets.fatG, barClass: "bg-muted/60" },
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
          contributions={macroContributions(meals, row.key)}
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
  contributions: Array<{ name: string; grams: number }>;
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
              <li key={contribution.name} className="flex items-center gap-2">
                <span className="w-1/2 truncate text-[11px] text-muted-foreground">{contribution.name}</span>
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

function MealsSection({
  meals,
  onRemoveMeal,
}: {
  meals: FoodDiaryEntryView[];
  onRemoveMeal: (mealId: string) => Promise<void>;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(mealId: string) {
    if (removingId) {
      return;
    }

    setRemovingId(mealId);
    setError(null);

    try {
      await onRemoveMeal(mealId);
    } catch (caught) {
      setError(describeFoodDiaryError(caught).message);
    } finally {
      setRemovingId(null);
    }
  }

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
          const items = meal.items.filter((item) => !item.isRemoved);
          const macros = mealMacroLine(meal);

          return (
            <li key={meal.id} className="dia-pop rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent">
                    <MealIcon meal={meal.mealType as MealType} size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {MEAL_LABELS[meal.mealType as MealType] ?? "Refeição"}
                      <span className="ml-2 text-xs font-normal text-muted">{formatMealTime(meal.loggedAt)}</span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {items.map((item) => item.name).join(" · ") || "Sem itens"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-display text-base font-bold text-foreground">
                    {mealKcal(meal)}
                    <span className="ml-0.5 text-[10px] font-medium text-muted">kcal</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void remove(meal.id)}
                    disabled={removingId === meal.id}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
                    title="Remover refeição"
                  >
                    {removingId === meal.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-muted">
                P {macros.proteinG}g · C {macros.carbG}g · G {macros.fatG}g
              </p>
            </li>
          );
        })}
      </ul>
      {error && <InlineError message={error} />}
    </section>
  );
}

/* ─── Gasto calórico (atividades reais) ──────────────────────────────────────── */

function BurnSection({
  activities,
  onAddActivity,
  onRemoveActivity,
}: {
  activities: ActivityEnergyView[];
  onAddActivity: (label: string, kcal: number) => Promise<void>;
  onRemoveActivity: (activityId: string) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [kcal, setKcal] = useState("");
  const [pending, setPending] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(activityLabel: string, value: number) {
    if (!Number.isFinite(value) || value <= 0 || pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      await onAddActivity(activityLabel, Math.round(value));
      setLabel("");
      setKcal("");
    } catch (caught) {
      setError(describeFoodDiaryError(caught).message);
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (removingId) {
      return;
    }

    setRemovingId(id);
    setError(null);

    try {
      await onRemoveActivity(id);
    } catch (caught) {
      setError(describeFoodDiaryError(caught).message);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="dia-rise">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Gasto calórico</h2>
        <p className="text-[11px] text-muted">Atividades registradas hoje</p>
      </div>

      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIVITIES.map((activity) => (
            <button
              key={activity.label}
              type="button"
              disabled={pending}
              onClick={() => void add(activity.label, activity.kcal)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-success/50 hover:text-foreground disabled:opacity-50"
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
            disabled={pending}
            onChange={(event) => setLabel(event.target.value)}
            className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted"
          />
          <input
            type="number"
            placeholder="kcal"
            min={0}
            value={kcal}
            disabled={pending}
            onChange={(event) => setKcal(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void add(label.trim() || "Atividade", Number(kcal));
            }}
            className="h-10 w-20 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted"
          />
          <button
            type="button"
            onClick={() => void add(label.trim() || "Atividade", Number(kcal))}
            disabled={pending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-strong text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
            title="Adicionar atividade"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          </button>
        </div>

        {error && <InlineError message={error} />}

        {activities.length > 0 && (
          <ul className="space-y-2">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="dia-pop flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
                    <Activity size={15} strokeWidth={1.8} />
                  </span>
                  <p className="truncate text-sm font-medium text-foreground">
                    {activity.label ?? "Atividade"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-bold text-success">+{activity.kcalBurned} kcal</span>
                  <button
                    type="button"
                    onClick={() => void remove(activity.id)}
                    disabled={removingId === activity.id}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
                    title="Remover atividade"
                  >
                    {removingId === activity.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ─── Meta diária (editar) ───────────────────────────────────────────────────── */

function TargetSection({
  targetKcal,
  onSetTarget,
}: {
  targetKcal: number;
  onSetTarget: (kcal: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(targetKcal));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const parsed = Number(draft);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      setEditing(false);
      return;
    }

    setPending(true);
    setError(null);

    try {
      await onSetTarget(Math.round(parsed));
      setEditing(false);
    } catch (caught) {
      setError(describeFoodDiaryError(caught).message);
    } finally {
      setPending(false);
    }
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
              disabled={pending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void save();
              }}
              className="h-10 w-24 rounded-lg border border-border bg-background px-3 text-right text-sm font-semibold text-foreground"
              aria-label="Meta diária em kcal"
            />
            <button
              type="button"
              onClick={() => void save()}
              disabled={pending}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-on transition-colors hover:bg-accent-hover disabled:opacity-60"
              title="Salvar meta"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
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
      {error && <InlineError message={error} />}
    </section>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function mealMacroLine(meal: FoodDiaryEntryView): { proteinG: number; carbG: number; fatG: number } {
  const confirmed = meal.confirmedTotals;
  const estimated = meal.estimatedTotals;

  return {
    proteinG: confirmed.proteinG ?? estimated.proteinG ?? 0,
    carbG: confirmed.carbG ?? estimated.carbG ?? 0,
    fatG: confirmed.fatG ?? estimated.fatG ?? 0,
  };
}

function formatMealTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function suggestMealByHour(): MealType {
  const hour = new Date().getHours();

  if (hour < 10) return "cafe_da_manha";
  if (hour < 14) return "almoco";
  if (hour < 18) return "lanche";
  return "jantar";
}
