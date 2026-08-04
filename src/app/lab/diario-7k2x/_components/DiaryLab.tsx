"use client";

import { useEffect, useMemo, useState } from "react";
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

import type {
  ActivityEntry,
  DayInsights,
  DayState,
  DiaryEntry,
  HistoryDay,
  MacroContribution,
  MacroKey,
  MealType,
} from "../_mock/mock";
import {
  MEAL_LABELS,
  QUICK_ACTIVITIES,
  SUGGESTED_TARGET_KCAL,
  buildDayInsights,
  buildMockHistory,
  clearDay,
  dayBurned,
  dayConsumed,
  emptyDay,
  entryTotals,
  loadDay,
  macroContributions,
  macroTargetsForKcal,
  nextId,
  saveDay,
  seedDay,
  suggestMealTypeByHour,
} from "../_mock/mock";
import { BalanceRing, useCountUp } from "./BalanceRing";
import { DayTrail, MealIcon } from "./bits";
import { HistoryView } from "./HistoryView";
import { MealWizard } from "./MealWizard";

/* ─── Pedaços locais ─────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone,
  delay,
}: {
  label: string;
  value: number;
  suffix: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  tone: "accent" | "success" | "neutral";
  delay: number;
}) {
  const display = useCountUp(value);
  const toneClass =
    tone === "accent"
      ? "text-accent bg-accent-muted"
      : tone === "success"
        ? "text-success bg-success-soft"
        : "text-muted-foreground bg-surface-strong";

  return (
    <div
      className="dlab-rise card-themed rounded-xl border border-border bg-surface p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon size={16} strokeWidth={1.8} />
      </div>
      <p className="mt-2.5 font-display text-xl font-bold tracking-tight text-foreground">
        {display}
        <span className="ml-1 text-xs font-medium text-muted">{suffix}</span>
      </p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
    </div>
  );
}

/** Barra de macro com meta ("Proteínas — 64g de 138g"), clicável para ver
 *  de quais alimentos o macro veio (drill-down). */
function MacroTargetRow({
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
  contributions: MacroContribution[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const percent = targetG > 0 ? Math.min((valueG / targetG) * 100, 100) : 0;
  const topContributions = contributions.slice(0, 4);
  const othersGrams =
    Math.round(
      contributions.slice(4).reduce((acc, contribution) => acc + contribution.grams, 0) * 10,
    ) / 10;

  return (
    <div>
      <button type="button" onClick={onToggle} className="group block w-full text-left">
        <div className="flex items-baseline justify-between gap-2">
          <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            {label}
            <ChevronDown
              size={12}
              className={[
                "text-muted transition-transform group-hover:text-foreground",
                isOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </p>
          <p className="text-[11px] tabular-nums text-muted">
            <span className="font-bold text-foreground">{valueG.toLocaleString("pt-BR")}g</span>
            {" de "}
            {targetG}g
          </p>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-strong">
          <div
            className={`dlab-macro-bar h-full rounded-full ${barClass}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </button>

      {isOpen && (
        <ul className="dlab-rise mt-2 space-y-1.5 rounded-lg bg-surface-strong/60 p-2.5">
          {topContributions.length === 0 && (
            <li className="text-[11px] text-muted">Nenhum alimento registrado ainda.</li>
          )}
          {topContributions.map((contribution) => {
            const share = valueG > 0 ? Math.min((contribution.grams / valueG) * 100, 100) : 0;

            return (
              <li key={contribution.nome} className="flex items-center gap-2">
                <span className="w-1/2 truncate text-[11px] text-muted-foreground">
                  {contribution.nome}
                </span>
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface">
                  <span
                    className={`dlab-macro-bar block h-full rounded-full ${barClass}`}
                    style={{ width: `${share}%` }}
                  />
                </span>
                <span className="w-11 shrink-0 text-right text-[11px] font-semibold tabular-nums text-foreground">
                  {contribution.grams.toLocaleString("pt-BR")}g
                </span>
              </li>
            );
          })}
          {othersGrams > 0 && (
            <li className="text-right text-[10px] text-muted">
              + outros {othersGrams.toLocaleString("pt-BR")}g
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** Barra de distribuição de macros (proporção por kcal: P×4, C×4, G×9). */
function MacroBar({ proteinaG, carboG, gorduraG }: { proteinaG: number; carboG: number; gorduraG: number }) {
  const proteinKcal = proteinaG * 4;
  const carbKcal = carboG * 4;
  const fatKcal = gorduraG * 9;
  const total = proteinKcal + carbKcal + fatKcal;

  if (total <= 0) {
    return null;
  }

  const proteinPct = (proteinKcal / total) * 100;
  const carbPct = (carbKcal / total) * 100;
  const fatPct = (fatKcal / total) * 100;

  return (
    <div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-strong">
        <div className="dlab-macro-bar h-full bg-success" style={{ width: `${proteinPct}%` }} />
        <div className="dlab-macro-bar h-full bg-accent" style={{ width: `${carbPct}%` }} />
        <div className="dlab-macro-bar h-full bg-muted/60" style={{ width: `${fatPct}%` }} />
      </div>
      <div className="mt-1.5 flex gap-3 text-[10px] text-muted">
        <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-success" />P {proteinaG}g</span>
        <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-accent" />C {carboG}g</span>
        <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-muted/60" />G {gorduraG}g</span>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function SkeletonScreen() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="dlab-shimmer h-8 w-56 rounded-lg" />
      <div className="dlab-shimmer h-64 w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        <div className="dlab-shimmer h-24 rounded-xl" />
        <div className="dlab-shimmer h-24 rounded-xl" />
        <div className="dlab-shimmer h-24 rounded-xl" />
      </div>
    </div>
  );
}

/* ─── Página do lab ──────────────────────────────────────────────────────────── */

export function DiaryLab() {
  // Estado nasce vazio e é semeado no cliente (evita mismatch de hidratação,
  // já que o seed usa Date/localStorage).
  const [day, setDay] = useState<DayState | null>(null);
  const [view, setView] = useState<"hoje" | "historico">("hoje");
  const [wizardMeal, setWizardMeal] = useState<MealType | null>(null);
  const [expandedMacro, setExpandedMacro] = useState<MacroKey | null>(null);
  const [showMacroInfo, setShowMacroInfo] = useState(false);
  const [insightsState, setInsightsState] = useState<"idle" | "processing" | "ready">("idle");
  const [insights, setInsights] = useState<DayInsights | null>(null);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState("");
  const [customActivityLabel, setCustomActivityLabel] = useState("");
  const [customActivityKcal, setCustomActivityKcal] = useState("");

  useEffect(() => {
    // localStorage é um sistema externo que só existe no cliente; o timer(0)
    // move o setState para um callback (evita setState síncrono no effect).
    const timer = window.setTimeout(() => setDay(loadDay() ?? seedDay()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (day) {
      saveDay(day);
    }
  }, [day]);

  const consumed = useMemo(() => (day ? dayConsumed(day) : null), [day]);
  const burned = day ? dayBurned(day) : 0;

  if (!day || !consumed) {
    return <SkeletonScreen />;
  }

  const loggedMeals = new Set<MealType>(day.entries.map((entry) => entry.mealType));
  const kcalByMeal: Partial<Record<MealType, number>> = {};

  for (const entry of day.entries) {
    kcalByMeal[entry.mealType] =
      (kcalByMeal[entry.mealType] ?? 0) + entryTotals(entry).kcal;
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const dateLabel = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  function addEntry(entry: DiaryEntry) {
    setDay((current) =>
      current ? { ...current, entries: [...current.entries, entry] } : current,
    );
  }

  function removeEntry(entryId: string) {
    setDay((current) =>
      current
        ? { ...current, entries: current.entries.filter((entry) => entry.id !== entryId) }
        : current,
    );
  }

  function addActivity(label: string, kcal: number) {
    const activity: ActivityEntry = { id: nextId("act"), label, kcal };

    setDay((current) =>
      current ? { ...current, activities: [...current.activities, activity] } : current,
    );
  }

  function removeActivity(activityId: string) {
    setDay((current) =>
      current
        ? {
            ...current,
            activities: current.activities.filter((activity) => activity.id !== activityId),
          }
        : current,
    );
  }

  function saveTarget() {
    const parsed = Number(targetDraft);

    if (Number.isFinite(parsed) && parsed > 0) {
      setDay((current) => (current ? { ...current, targetKcal: Math.round(parsed) } : current));
    }

    setIsEditingTarget(false);
  }

  function addCustomActivity() {
    const kcal = Number(customActivityKcal);

    if (!Number.isFinite(kcal) || kcal <= 0) {
      return;
    }

    addActivity(customActivityLabel.trim() || "Atividade", Math.round(kcal));
    setCustomActivityLabel("");
    setCustomActivityKcal("");
  }

  function resetMock() {
    clearDay();
    setDay(seedDay());
  }

  const targetKcal = day.targetKcal;
  const hasTarget = targetKcal !== null;
  const effectiveTarget = targetKcal ?? SUGGESTED_TARGET_KCAL;
  const macroTargets = macroTargetsForKcal(effectiveTarget);
  const extrasCount = day.entries.filter((entry) => entry.mealType === "extra").length;
  const hasFirstMeal = day.entries.length > 0;
  const hasBurnInfo = burned > 0;
  const showFirstSteps = !hasTarget || !hasFirstMeal;

  const todayPoint: HistoryDay = {
    dateKey: day.dateKey,
    weekdayLabel: "hoje",
    dateLabel: now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    consumedKcal: consumed.kcal,
    burnedKcal: burned,
    targetKcal: effectiveTarget,
    isToday: true,
  };
  const history: HistoryDay[] = [...buildMockHistory(13, effectiveTarget), todayPoint];

  function applyTarget(value: number) {
    setDay((current) => (current ? { ...current, targetKcal: Math.round(value) } : current));
    setIsEditingTarget(false);
  }

  const anchorsLogged = new Set(
    day.entries.filter((entry) => entry.mealType !== "extra").map((entry) => entry.mealType),
  ).size;

  function generateInsights() {
    const currentDay = day;
    const currentConsumed = consumed;

    if (!currentDay || !currentConsumed) {
      return;
    }

    setInsightsState("processing");

    // Mock do processamento: na v1 real estas dicas podem vir das mesmas regras
    // (custo zero, resposta instantânea); IA generativa entra via Chat Move depois.
    window.setTimeout(() => {
      setInsights(
        buildDayInsights({
          consumed: currentConsumed,
          burned,
          targetKcal: effectiveTarget,
          macroTargets,
          anchorsLogged,
          hasDinner: currentDay.entries.some((entry) => entry.mealType === "jantar"),
          hasActivity: burned > 0,
        }),
      );
      setInsightsState("ready");
    }, 1700);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24 sm:py-10">
      {/* Header */}
      <header className="dlab-rise">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
            Diário Alimentar
          </p>
          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">
            Lab · 100% simulado
          </span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {greeting}! Seu balanço de hoje
        </h1>
        <p className="mt-1 text-sm capitalize text-muted">{dateLabel}</p>
      </header>

      {/* Abas: hoje enxuto, análise no histórico */}
      <div
        className="dlab-rise mt-5 flex rounded-xl border border-border bg-surface p-1 text-sm font-semibold"
        style={{ animationDelay: "50ms" }}
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === "hoje"}
          onClick={() => setView("hoje")}
          className={[
            "flex-1 rounded-lg px-4 py-2 transition-colors",
            view === "hoje" ? "bg-accent text-accent-on" : "text-muted hover:text-foreground",
          ].join(" ")}
        >
          Hoje
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "historico"}
          disabled={!hasTarget}
          onClick={() => setView("historico")}
          title={hasTarget ? undefined : "Defina sua meta para liberar o histórico"}
          className={[
            "flex-1 rounded-lg px-4 py-2 transition-colors",
            view === "historico" ? "bg-accent text-accent-on" : "text-muted hover:text-foreground",
            hasTarget ? "" : "cursor-not-allowed opacity-40",
          ].join(" ")}
        >
          Histórico
        </button>
      </div>

      {view === "historico" && (
        <div className="mt-5">
          <HistoryView history={history} />
        </div>
      )}

      {view === "hoje" && (
        <>
      {/* Primeiros passos (só até completar o essencial) */}
      {showFirstSteps && (
        <section className="dlab-rise mt-5 rounded-2xl border border-accent/30 bg-surface p-5 ring-1 ring-accent/10" style={{ animationDelay: "70ms" }}>
          <h2 className="text-sm font-bold text-foreground">Primeiros passos</h2>
          <ul className="mt-3 space-y-2.5">
            {[
              { label: "Defina sua meta calórica do dia", done: hasTarget },
              { label: "Registre sua primeira refeição com foto", done: hasFirstMeal },
              { label: "Informe seu gasto (atividade ou estimativa)", done: hasBurnInfo },
            ].map((stepItem, index) => (
              <li key={stepItem.label} className="dlab-rise flex items-center gap-3" style={{ animationDelay: `${140 + index * 90}ms` }}>
                <span
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                    stepItem.done
                      ? "border-success bg-success text-white"
                      : "border-border-strong text-transparent",
                  ].join(" ")}
                >
                  <Check size={13} strokeWidth={3} />
                </span>
                <span
                  className={[
                    "text-sm",
                    stepItem.done ? "text-muted line-through" : "font-medium text-foreground",
                  ].join(" ")}
                >
                  {stepItem.label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Hero: setup da meta (primeiro uso) ou anel de balanço */}
      {targetKcal === null ? (
        <section className="dlab-rise mt-6 overflow-hidden rounded-2xl border border-border bg-surface p-6 text-center sm:p-8" style={{ animationDelay: "110ms" }}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-muted text-accent">
            <Target size={26} strokeWidth={1.8} />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-foreground">
            Qual sua meta de hoje?
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
            Com uma meta, seu anel de balanço mostra em tempo real quanto ainda cabe no
            dia. Sugerimos um valor com base no seu perfil — ajuste quando quiser.
          </p>

          <button
            type="button"
            onClick={() => applyTarget(SUGGESTED_TARGET_KCAL)}
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
              value={targetDraft}
              onChange={(event) => setTargetDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveTarget();
              }}
              className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-center text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted"
              aria-label="Meta personalizada em kcal"
            />
            <button
              type="button"
              onClick={saveTarget}
              disabled={!(Number(targetDraft) > 0)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-strong text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
              title="Definir meta"
            >
              <Check size={16} />
            </button>
          </div>

          <p className="mt-4 text-[11px] text-muted">
            Na versão final, a sugestão vem da sua TMB calculada no Scan corporal.
          </p>
        </section>
      ) : (
      <section className="dlab-rise mt-6 overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8" style={{ animationDelay: "80ms" }}>
        <div className="grid items-center gap-8 sm:grid-cols-[auto_1fr]">
          <BalanceRing
            consumedKcal={consumed.kcal}
            targetKcal={targetKcal}
            burnedKcal={burned}
            burnReferenceKcal={Math.max(day.estimatedDailyBurn, 1)}
          />

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Consumido" value={consumed.kcal} suffix="kcal" icon={Flame} tone="accent" delay={150} />
              <StatCard label="Gasto" value={burned} suffix="kcal" icon={Zap} tone="success" delay={250} />
              <StatCard label="Meta" value={targetKcal} suffix="kcal" icon={Target} tone="neutral" delay={350} />
            </div>

            <div className="dlab-rise space-y-3 rounded-xl border border-border bg-background/40 p-4" style={{ animationDelay: "420ms" }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                  Macros do dia
                </p>
                <button
                  type="button"
                  onClick={() => setShowMacroInfo((current) => !current)}
                  className={[
                    "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                    showMacroInfo
                      ? "bg-accent-soft text-accent"
                      : "text-muted hover:text-foreground",
                  ].join(" ")}
                  title="De onde vêm esses alvos?"
                >
                  <Info size={13} />
                </button>
              </div>
              {showMacroInfo && (
                <p className="dlab-rise rounded-lg bg-surface-strong/60 p-2.5 text-[11px] leading-relaxed text-muted">
                  Alvos derivados automaticamente da sua meta de{" "}
                  {effectiveTarget.toLocaleString("pt-BR")} kcal (25% proteínas · 45%
                  carboidratos · 30% gorduras). Na versão final, seu personal poderá
                  personalizar esse split para o seu objetivo. Toque em um macro para ver
                  de quais alimentos ele veio.
                </p>
              )}
              <MacroTargetRow
                label="Proteínas"
                valueG={consumed.proteinaG}
                targetG={macroTargets.proteinaG}
                barClass="bg-success"
                contributions={macroContributions(day, "proteinaG")}
                isOpen={expandedMacro === "proteinaG"}
                onToggle={() =>
                  setExpandedMacro((current) => (current === "proteinaG" ? null : "proteinaG"))
                }
              />
              <MacroTargetRow
                label="Carboidratos"
                valueG={consumed.carboG}
                targetG={macroTargets.carboG}
                barClass="bg-accent"
                contributions={macroContributions(day, "carboG")}
                isOpen={expandedMacro === "carboG"}
                onToggle={() =>
                  setExpandedMacro((current) => (current === "carboG" ? null : "carboG"))
                }
              />
              <MacroTargetRow
                label="Gorduras"
                valueG={consumed.gorduraG}
                targetG={macroTargets.gorduraG}
                barClass="bg-muted/60"
                contributions={macroContributions(day, "gorduraG")}
                isOpen={expandedMacro === "gorduraG"}
                onToggle={() =>
                  setExpandedMacro((current) => (current === "gorduraG" ? null : "gorduraG"))
                }
              />
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Trilha do dia */}
      <section className="dlab-rise mt-4 rounded-2xl border border-border bg-surface p-5" style={{ animationDelay: "180ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Trilha do dia</h2>
          <p className="text-[11px] text-muted">
            {/* Âncoras distintas preenchidas — repetir um almoço não conta duas vezes. */}
            {new Set(day.entries.filter((entry) => entry.mealType !== "extra").map((entry) => entry.mealType)).size} de 4 refeições
            {extrasCount > 0 && (
              <span className="ml-1.5 rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">
                +{extrasCount} extra{extrasCount > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <DayTrail
          loggedMeals={loggedMeals}
          kcalByMeal={kcalByMeal}
          onPickMeal={(meal) => setWizardMeal(meal)}
        />
      </section>

      {/* CTA principal */}
      <button
        type="button"
        onClick={() => setWizardMeal(suggestMealTypeByHour(new Date().getHours()))}
        className="dlab-rise mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-accent px-6 py-4 text-sm font-bold text-accent-on shadow-[0_8px_30px_rgba(242,106,27,0.28)] transition-all hover:bg-accent-hover hover:shadow-[0_8px_36px_rgba(242,106,27,0.4)]"
        style={{ animationDelay: "260ms" }}
      >
        <Camera size={18} strokeWidth={2} />
        Registrar refeição com foto
      </button>

      {/* Refeições do dia */}
      <section className="dlab-rise mt-8" style={{ animationDelay: "320ms" }}>
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Refeições de hoje
        </h2>
        <ul className="mt-3 space-y-3">
          {day.entries.length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">
              Nenhuma refeição registrada ainda. Fotografe seu prato para começar.
            </li>
          )}
          {day.entries.map((entry) => {
            const totals = entryTotals(entry);

            return (
              <li
                key={entry.id}
                className="dlab-pop card-themed rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent">
                      <MealIcon meal={entry.mealType} size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {MEAL_LABELS[entry.mealType]}
                        <span className="ml-2 text-xs font-normal text-muted">
                          {formatTime(entry.loggedAtISO)}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {entry.itens.map((item) => item.nome).join(" · ")}
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
                      onClick={() => removeEntry(entry.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                      title="Remover refeição"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <MacroBar
                    proteinaG={totals.proteinaG}
                    carboG={totals.carboG}
                    gorduraG={totals.gorduraG}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Análise do dia — resumo e dicas gerados dos dados reais do diário */}
      {hasTarget && day.entries.length > 0 && (
        <section className="dlab-rise mt-8" style={{ animationDelay: "360ms" }}>
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Análise do dia
          </h2>

          {insightsState === "idle" && (
            <button
              type="button"
              onClick={generateInsights}
              className="card-themed group mt-3 flex w-full items-center gap-4 rounded-2xl border border-accent/30 bg-surface p-5 text-left ring-1 ring-accent/10 transition-colors hover:bg-surface-hover"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-on">
                <Sparkles size={20} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">
                  Analisar meu dia
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  Resumo do seu balanço e dicas do que ajustar nas próximas refeições.
                </span>
              </span>
              <ChevronDown size={16} className="shrink-0 -rotate-90 text-accent transition-transform group-hover:translate-x-0.5" />
            </button>
          )}

          {insightsState === "processing" && (
            <div className="mt-3 space-y-3 rounded-2xl border border-border bg-surface p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles size={16} className="animate-pulse text-accent" />
                Analisando seu dia...
              </p>
              <div className="dlab-shimmer h-3.5 w-3/4 rounded-full" />
              <div className="dlab-shimmer h-3.5 w-full rounded-full" />
              <div className="dlab-shimmer h-3.5 w-2/3 rounded-full" />
            </div>
          )}

          {insightsState === "ready" && insights && (
            <div className="dlab-pop mt-3 rounded-2xl border border-border bg-surface p-5">
              <p className="text-sm font-semibold leading-relaxed text-foreground">
                {insights.headline}
              </p>
              <ul className="mt-3 space-y-2.5">
                {insights.tips.map((tip, index) => (
                  <li
                    key={tip}
                    className="dlab-rise flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                    style={{ animationDelay: `${150 + index * 130}ms` }}
                  >
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
                  onClick={generateInsights}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-strong px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-surface-hover"
                >
                  <RotateCcw size={12} />
                  Atualizar
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Gasto calórico */}
      <section className="dlab-rise mt-8" style={{ animationDelay: "380ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Gasto calórico
          </h2>
          <div className="flex rounded-lg border border-border bg-surface p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() =>
                setDay((current) => (current ? { ...current, burnMode: "atividades" } : current))
              }
              className={[
                "rounded-md px-2.5 py-1 transition-colors",
                day.burnMode === "atividades"
                  ? "bg-accent text-accent-on"
                  : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              Por atividade
            </button>
            <button
              type="button"
              onClick={() =>
                setDay((current) => (current ? { ...current, burnMode: "estimativa" } : current))
              }
              className={[
                "rounded-md px-2.5 py-1 transition-colors",
                day.burnMode === "estimativa"
                  ? "bg-accent text-accent-on"
                  : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              Estimativa do dia
            </button>
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
                onChange={(event) =>
                  setDay((current) =>
                    current
                      ? {
                          ...current,
                          estimatedDailyBurn: Math.max(Number(event.target.value) || 0, 0),
                        }
                      : current,
                  )
                }
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
                  onClick={() => addActivity(activity.label, activity.kcal)}
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
                value={customActivityLabel}
                onChange={(event) => setCustomActivityLabel(event.target.value)}
                className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted"
              />
              <input
                type="number"
                placeholder="kcal"
                min={0}
                value={customActivityKcal}
                onChange={(event) => setCustomActivityKcal(event.target.value)}
                className="h-10 w-20 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted"
              />
              <button
                type="button"
                onClick={addCustomActivity}
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
                    className="dlab-pop flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
                        <Activity size={15} strokeWidth={1.8} />
                      </span>
                      <p className="truncate text-sm font-medium text-foreground">
                        {activity.label}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-bold text-success">+{activity.kcal} kcal</span>
                      <button
                        type="button"
                        onClick={() => removeActivity(activity.id)}
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

      {/* Meta diária */}
      <section className="dlab-rise mt-8" style={{ animationDelay: "440ms" }}>
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Meta diária</h2>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent">
            <Target size={18} strokeWidth={1.8} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Consumo alvo</p>
            <p className="text-xs text-muted">
              Na versão final pode vir da sua TMB (calculada no Scan)
            </p>
          </div>
          {isEditingTarget ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                autoFocus
                value={targetDraft}
                onChange={(event) => setTargetDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveTarget();
                }}
                className="h-10 w-24 rounded-lg border border-border bg-background px-3 text-right text-sm font-semibold text-foreground"
                aria-label="Meta diária em kcal"
              />
              <button
                type="button"
                onClick={saveTarget}
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
                setTargetDraft(String(targetKcal ?? SUGGESTED_TARGET_KCAL));
                setIsEditingTarget(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-strong px-3.5 py-2 text-sm font-bold text-foreground transition-colors hover:bg-surface-hover"
            >
              {targetKcal === null ? "Definir meta" : `${targetKcal} kcal`}
              <Pencil size={13} className="text-muted" />
            </button>
          )}
        </div>
      </section>
        </>
      )}

      {/* Rodapé do lab */}
      <footer className="mt-10 flex flex-col items-center gap-3 border-t border-border pt-6 text-center">
        <p className="max-w-md text-[11px] leading-relaxed text-muted">
          Protótipo interno do módulo Diário Alimentar. Todos os dados são simulados e
          ficam apenas neste navegador — nenhuma foto é enviada, nenhuma IA é chamada.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={resetMock}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <RotateCcw size={13} />
            Reiniciar simulação
          </button>
          <button
            type="button"
            onClick={() => {
              setView("hoje");
              setDay(emptyDay());
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Target size={13} />
            Simular primeiro uso
          </button>
        </div>
      </footer>

      {/* Wizard */}
      {wizardMeal !== null && (
        <MealWizard
          initialMealType={wizardMeal}
          dayEntryCount={day.entries.length}
          onConfirm={addEntry}
          onClose={() => setWizardMeal(null)}
        />
      )}
    </div>
  );
}
