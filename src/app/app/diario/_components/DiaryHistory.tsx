"use client";

import { useMemo } from "react";
import { CalendarCheck, Flame, TrendingDown, TrendingUp } from "lucide-react";

import type { HistoryDay } from "../_mock/diaryMock";
import { dayBalance, formatKcal } from "../_mock/diaryMock";

/**
 * Histórico do Diário — versão P1 visual: consumo vs. meta por dia (7 dias),
 * balanço do período e dias dentro da meta.
 *
 * Deliberadamente SEM "variação estimada de peso": ficou fora do P1 por risco de
 * falsa precisão (erro da estimativa por foto composto com a conversão genérica
 * de ~7700 kcal/kg). Ver docs/diario-alimentar/07, seção 13.
 */
export function DiaryHistory({ history }: { history: HistoryDay[] }) {
  const stats = useMemo(() => {
    const balances = history.map(dayBalance);
    const totalBalance = balances.reduce((acc, value) => acc + value, 0);
    const averageConsumed = Math.round(
      history.reduce((acc, day) => acc + day.consumedKcal, 0) / Math.max(history.length, 1),
    );
    const daysOnTarget = balances.filter((value) => value <= 0).length;

    return { totalBalance, averageConsumed, daysOnTarget };
  }, [history]);

  const isDeficit = stats.totalBalance <= 0;
  const chartMax =
    Math.max(...history.map((day) => day.consumedKcal), history[0]?.targetKcal ?? 0) * 1.1;
  const targetKcal = history[0]?.targetKcal ?? 0;

  return (
    <div className="space-y-4">
      {/* Resumo do período */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryCard
          tone={isDeficit ? "success" : "accent"}
          icon={isDeficit ? TrendingDown : TrendingUp}
          value={`${stats.totalBalance > 0 ? "+" : ""}${formatKcal(stats.totalBalance)}`}
          unit="kcal"
          label={isDeficit ? "Déficit no período" : "Superávit no período"}
        />
        <SummaryCard
          tone="neutral"
          icon={Flame}
          value={formatKcal(stats.averageConsumed)}
          unit="kcal"
          label="Média por dia"
        />
        <SummaryCard
          tone="accent"
          icon={CalendarCheck}
          value={`${stats.daysOnTarget}/${history.length}`}
          label="Dias na meta"
        />
      </div>

      {/* Gráfico: consumo por dia vs. meta */}
      <section className="dia-rise rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-bold text-foreground">Consumo por dia</h3>
          <p className="text-[11px] text-muted">
            média {formatKcal(stats.averageConsumed)} kcal · linha = meta
          </p>
        </div>

        <div className="relative mt-4">
          <div
            className="absolute inset-x-0 border-t border-dashed border-foreground/30"
            style={{ bottom: `${(targetKcal / chartMax) * 100}%` }}
            aria-hidden="true"
          />

          <div className="flex h-36 items-end gap-1.5">
            {history.map((day, index) => {
              const heightPercent = Math.min((day.consumedKcal / chartMax) * 100, 100);
              const isOver = dayBalance(day) > 0;

              return (
                <div
                  key={day.key}
                  className="group relative flex h-full flex-1 flex-col items-center justify-end"
                  title={`${day.dateLabel} · ${day.consumedKcal} kcal consumidas · ${day.burnedKcal} gastas`}
                >
                  <div
                    className={[
                      "dia-grow-y w-full rounded-t-md transition-colors",
                      day.isToday
                        ? "bg-accent shadow-[0_0_14px_rgba(242,106,27,0.4)]"
                        : isOver
                          ? "bg-accent/40 group-hover:bg-accent/60"
                          : "bg-success/45 group-hover:bg-success/65",
                    ].join(" ")}
                    style={{ height: `${heightPercent}%`, animationDelay: `${index * 45}ms` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-1.5 flex gap-1.5">
            {history.map((day) => (
              <p
                key={day.key}
                className={[
                  "flex-1 text-center text-[9px] font-medium leading-none",
                  day.isToday ? "font-bold text-accent" : "text-muted",
                ].join(" ")}
              >
                {day.isToday ? "hoje" : day.weekdayLabel}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted">
          <span>
            <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-success/45" />
            dentro da meta
          </span>
          <span>
            <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-accent/40" />
            acima da meta
          </span>
          <span>
            <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-accent" />
            hoje
          </span>
        </div>
      </section>

      {/* Dia a dia */}
      <section className="dia-rise">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted">Dia a dia</h3>
        <ul className="mt-3 space-y-2">
          {[...history].reverse().map((day) => {
            const balance = dayBalance(day);
            const isOver = balance > 0;

            return (
              <li
                key={day.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-12 text-xs font-bold capitalize text-foreground">
                    {day.isToday ? "Hoje" : day.weekdayLabel}
                  </span>
                  <span className="text-xs text-muted">{day.dateLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">{formatKcal(day.consumedKcal)} kcal</span>
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                      isOver ? "bg-accent-soft text-accent" : "bg-success-soft text-success",
                    ].join(" ")}
                  >
                    {isOver ? "+" : ""}
                    {formatKcal(balance)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function SummaryCard({
  tone,
  icon: Icon,
  value,
  unit,
  label,
}: {
  tone: "accent" | "success" | "neutral";
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  value: string;
  unit?: string;
  label: string;
}) {
  const toneClass =
    tone === "success"
      ? "bg-success-soft text-success"
      : tone === "accent"
        ? "bg-accent-muted text-accent"
        : "bg-surface-strong text-muted-foreground";

  return (
    <div className="dia-rise rounded-xl border border-border bg-surface p-4">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon size={16} strokeWidth={1.8} />
      </div>
      <p className="mt-2.5 font-display text-xl font-bold tracking-tight text-foreground">
        {value}
        {unit && <span className="ml-1 text-xs font-medium text-muted">{unit}</span>}
      </p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}
