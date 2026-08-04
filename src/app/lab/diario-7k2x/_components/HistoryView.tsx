"use client";

import { useMemo } from "react";
import { Scale, TrendingDown, TrendingUp } from "lucide-react";

import type { HistoryDay } from "../_mock/mock";
import { KCAL_PER_KG, dayBalance } from "../_mock/mock";

/**
 * Visão de histórico (14 dias): consumo vs. meta por dia, balanço acumulado e
 * estimativa de variação de peso. Fica numa aba própria para a tela "Hoje"
 * continuar enxuta — divulgação progressiva, não um dashboard lotado.
 */
export function HistoryView({ history }: { history: HistoryDay[] }) {
  const stats = useMemo(() => {
    const balances = history.map(dayBalance);
    const totalBalance = balances.reduce((acc, value) => acc + value, 0);
    const averageConsumed = Math.round(
      history.reduce((acc, day) => acc + day.consumedKcal, 0) / Math.max(history.length, 1),
    );
    const daysOnTarget = balances.filter((value) => value <= 0).length;

    // Série acumulada para a linha de progresso.
    const cumulative: number[] = [];

    for (let index = 0; index < balances.length; index += 1) {
      const previous = index > 0 ? cumulative[index - 1] : 0;
      cumulative.push(previous + balances[index]);
    }

    return {
      totalBalance,
      averageConsumed,
      daysOnTarget,
      cumulative,
      estimatedKg: totalBalance / KCAL_PER_KG,
    };
  }, [history]);

  const isDeficit = stats.totalBalance <= 0;
  const chartMax = Math.max(...history.map((day) => day.consumedKcal), history[0]?.targetKcal ?? 0) * 1.1;

  /* Linha do balanço acumulado (SVG normalizado). */
  const sparkline = useMemo(() => {
    const width = 280;
    const height = 56;
    const values = stats.cumulative;

    if (values.length < 2) {
      return { points: "", zeroY: height / 2 };
    }

    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const span = Math.max(max - min, 1);
    const padding = 4;
    const usable = height - padding * 2;

    const toY = (value: number) => padding + usable - ((value - min) / span) * usable;
    const points = values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        return `${Math.round(x * 10) / 10},${Math.round(toY(value) * 10) / 10}`;
      })
      .join(" ");

    return { points, zeroY: toY(0) };
  }, [stats.cumulative]);

  return (
    <div className="space-y-4">
      {/* Resumo do período */}
      <div className="grid grid-cols-3 gap-3">
        <div className="dlab-rise card-themed rounded-xl border border-border bg-surface p-4">
          <div
            className={[
              "flex h-8 w-8 items-center justify-center rounded-lg",
              isDeficit ? "bg-success-soft text-success" : "bg-accent-muted text-accent",
            ].join(" ")}
          >
            {isDeficit ? <TrendingDown size={16} strokeWidth={1.8} /> : <TrendingUp size={16} strokeWidth={1.8} />}
          </div>
          <p className="mt-2.5 font-display text-xl font-bold tracking-tight text-foreground">
            {stats.totalBalance > 0 ? "+" : ""}
            {stats.totalBalance.toLocaleString("pt-BR")}
            <span className="ml-1 text-xs font-medium text-muted">kcal</span>
          </p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted">
            {isDeficit ? "Déficit no período" : "Superávit no período"}
          </p>
        </div>

        <div className="dlab-rise card-themed rounded-xl border border-border bg-surface p-4" style={{ animationDelay: "90ms" }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-strong text-muted-foreground">
            <Scale size={16} strokeWidth={1.8} />
          </div>
          <p className="mt-2.5 font-display text-xl font-bold tracking-tight text-foreground">
            {stats.estimatedKg > 0 ? "+" : ""}
            {stats.estimatedKg.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
            <span className="ml-1 text-xs font-medium text-muted">kg</span>
          </p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted">
            Variação estimada
          </p>
        </div>

        <div className="dlab-rise card-themed rounded-xl border border-border bg-surface p-4" style={{ animationDelay: "180ms" }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted text-accent">
            <span className="text-xs font-bold">{stats.daysOnTarget}</span>
          </div>
          <p className="mt-2.5 font-display text-xl font-bold tracking-tight text-foreground">
            {stats.daysOnTarget}
            <span className="mx-0.5 text-sm text-muted">/</span>
            {history.length}
          </p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted">
            Dias na meta
          </p>
        </div>
      </div>

      {/* Gráfico: consumo por dia vs. meta */}
      <section className="dlab-rise card-themed rounded-2xl border border-border bg-surface p-5" style={{ animationDelay: "140ms" }}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-bold text-foreground">Consumo por dia</h3>
          <p className="text-[11px] text-muted">
            média {stats.averageConsumed.toLocaleString("pt-BR")} kcal · linha = meta
          </p>
        </div>

        <div className="relative mt-4">
          {/* Linha da meta */}
          <div
            className="absolute inset-x-0 border-t border-dashed border-foreground/30"
            style={{ bottom: `${((history[0]?.targetKcal ?? 0) / chartMax) * 100}%` }}
            aria-hidden="true"
          />

          <div className="flex h-36 items-end gap-1.5">
            {history.map((day, index) => {
              const heightPercent = Math.min((day.consumedKcal / chartMax) * 100, 100);
              const isOver = dayBalance(day) > 0;

              return (
                <div
                  key={day.dateKey}
                  className="group relative flex h-full flex-1 flex-col items-center justify-end"
                  title={`${day.dateLabel} · ${day.consumedKcal} kcal consumidas · ${day.burnedKcal} gastas`}
                >
                  <div
                    className={[
                      "dlab-grow-y w-full rounded-t-md transition-colors",
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
                key={day.dateKey}
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
          <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-success/45" />dentro da meta</span>
          <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-accent/40" />acima da meta</span>
          <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-accent" />hoje</span>
        </div>
      </section>

      {/* Balanço acumulado (progresso de perda/ganho) */}
      <section className="dlab-rise card-themed rounded-2xl border border-border bg-surface p-5" style={{ animationDelay: "220ms" }}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-bold text-foreground">Balanço acumulado</h3>
          <p className="text-[11px] text-muted">
            abaixo de zero = tendência de perda
          </p>
        </div>

        <svg
          viewBox="0 0 280 56"
          preserveAspectRatio="none"
          className="mt-3 h-16 w-full"
          aria-hidden="true"
        >
          <line
            x1="0"
            y1={sparkline.zeroY}
            x2="280"
            y2={sparkline.zeroY}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 4"
            className="text-foreground/25"
          />
          <polyline
            pathLength={1}
            points={sparkline.points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={["dlab-draw", isDeficit ? "text-success" : "text-accent"].join(" ")}
          />
        </svg>

        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Cada ponto soma o saldo do dia (consumido − meta − gasto). Estimativa de peso
          usa ~7.700 kcal por kg — é uma referência, não uma balança.
        </p>
      </section>

      {/* Últimos dias em lista */}
      <section className="dlab-rise" style={{ animationDelay: "280ms" }}>
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
          Dia a dia
        </h3>
        <ul className="mt-3 space-y-2">
          {[...history].reverse().slice(0, 7).map((day) => {
            const balance = dayBalance(day);
            const isOver = balance > 0;

            return (
              <li
                key={day.dateKey}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-12 text-xs font-bold capitalize text-foreground">
                    {day.isToday ? "Hoje" : day.weekdayLabel}
                  </span>
                  <span className="text-xs text-muted">{day.dateLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    {day.consumedKcal.toLocaleString("pt-BR")} kcal
                  </span>
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-[10px] font-bold",
                      isOver ? "bg-accent-soft text-accent" : "bg-success-soft text-success",
                    ].join(" ")}
                  >
                    {isOver ? "+" : ""}
                    {balance.toLocaleString("pt-BR")}
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
