"use client";

import { useMemo } from "react";
import { CalendarCheck, Flame, TrendingUp } from "lucide-react";

import type { FoodDiaryHistoryDay, FoodDiaryHistoryStatus } from "@/bff/modules/foodDiary/types";

import { formatKcal } from "../_content";

/**
 * Histórico 2.0 — mesma lógica do Hoje: cada dia é classificado contra a FAIXA-ALVO
 * do PLANO que valia naquele dia (não a meta legada). Sem "déficit": status é
 * abaixo / dentro / acima / incompleto (sem plano no dia).
 */
export function DiaryHistory({ days }: { days: FoodDiaryHistoryDay[] }) {
  const rows = useMemo(
    () =>
      days.map((day, index) => ({
        ...day,
        isToday: index === days.length - 1,
        weekdayLabel: weekdayLabel(day.date),
        dateLabel: dayMonthLabel(day.date),
      })),
    [days],
  );

  const stats = useMemo(() => {
    const withPlan = rows.filter((day) => day.status !== "incomplete");
    const daysWithin = rows.filter((day) => day.status === "within").length;
    const daysAbove = rows.filter((day) => day.status === "above").length;
    const averageConsumed = Math.round(
      rows.reduce((acc, day) => acc + day.consumedKcal, 0) / Math.max(rows.length, 1),
    );

    return { daysWithin, daysAbove, averageConsumed, plannedDays: withPlan.length };
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
        Ainda não há histórico para mostrar. Registre refeições ao longo dos dias.
      </div>
    );
  }

  const scaleMax =
    Math.max(...rows.map((day) => Math.max(day.consumedKcal, day.bandHighKcal ?? 0)), 1) * 1.1;

  return (
    <div className="space-y-4">
      {/* Resumo do período (sem "déficit") */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryCard
          tone="success"
          icon={CalendarCheck}
          value={`${stats.daysWithin}/${rows.length}`}
          label="Dias na faixa"
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
          icon={TrendingUp}
          value={`${stats.daysAbove}`}
          label="Dias acima"
        />
      </div>

      {/* Gráfico: consumo por dia dentro/fora da faixa do plano */}
      <section className="dia-rise rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-bold text-foreground">Consumo vs. sua faixa</h3>
          <p className="text-[11px] text-muted">
            {stats.plannedDays < rows.length ? "área = faixa-alvo do dia" : "área = faixa-alvo"}
          </p>
        </div>

        <div className="mt-4 flex h-36 items-end gap-1.5">
          {rows.map((day, index) => {
            const consumedHeight = Math.min((day.consumedKcal / scaleMax) * 100, 100);
            const hasBand = day.bandLowKcal !== null && day.bandHighKcal !== null;
            const bandBottom = hasBand ? ((day.bandLowKcal ?? 0) / scaleMax) * 100 : 0;
            const bandHeight = hasBand
              ? (((day.bandHighKcal ?? 0) - (day.bandLowKcal ?? 0)) / scaleMax) * 100
              : 0;

            return (
              <div
                key={day.date}
                className="group relative flex h-full flex-1 flex-col items-center justify-end"
                title={`${day.dateLabel} · ${day.consumedKcal} kcal · ${statusLabel(day.status)}`}
              >
                {hasBand && (
                  <div
                    className="absolute inset-x-0 rounded-sm bg-success/20"
                    style={{ bottom: `${bandBottom}%`, height: `${bandHeight}%` }}
                    aria-hidden="true"
                  />
                )}
                <div
                  className={[
                    "dia-grow-y relative w-full rounded-t-md transition-colors",
                    barClass(day.status, day.isToday),
                  ].join(" ")}
                  style={{ height: `${consumedHeight}%`, animationDelay: `${index * 45}ms` }}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-1.5 flex gap-1.5">
          {rows.map((day) => (
            <p
              key={day.date}
              className={[
                "flex-1 text-center text-[9px] font-medium leading-none",
                day.isToday ? "font-bold text-accent" : "text-muted",
              ].join(" ")}
            >
              {day.isToday ? "hoje" : day.weekdayLabel}
            </p>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted">
          <Legend className="bg-success" label="dentro da faixa" />
          <Legend className="bg-accent/50" label="abaixo" />
          <Legend className="bg-accent" label="acima" />
          <Legend className="bg-surface-strong" label="sem plano" />
        </div>
      </section>

      {/* Dia a dia */}
      <section className="dia-rise">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted">Dia a dia</h3>
        <ul className="mt-3 space-y-2">
          {[...rows].reverse().map((day) => (
            <li
              key={day.date}
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
                  {formatKcal(day.consumedKcal)} kcal
                  {day.consumedProteinG > 0 ? ` · P ${Math.round(day.consumedProteinG)}g` : ""}
                </span>
                <StatusBadge status={day.status} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ─── bits ─── */

function barClass(status: FoodDiaryHistoryStatus, isToday: boolean): string {
  if (status === "incomplete") {
    return "bg-surface-strong";
  }
  if (status === "within") {
    return isToday ? "bg-success shadow-[0_0_12px_rgba(52,199,89,0.35)]" : "bg-success/80";
  }
  if (status === "above") {
    return isToday ? "bg-accent shadow-[0_0_12px_rgba(242,106,27,0.4)]" : "bg-accent/70";
  }
  return "bg-accent/40"; // below
}

function statusLabel(status: FoodDiaryHistoryStatus): string {
  switch (status) {
    case "within":
      return "dentro da faixa";
    case "above":
      return "acima da faixa";
    case "below":
      return "abaixo da faixa";
    case "incomplete":
      return "sem plano";
  }
}

function StatusBadge({ status }: { status: FoodDiaryHistoryStatus }) {
  const tone =
    status === "within"
      ? "bg-success-soft text-success"
      : status === "above"
        ? "bg-accent-soft text-accent"
        : status === "below"
          ? "bg-accent-muted text-accent"
          : "bg-surface-strong text-muted";

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>
      {status === "within" ? "Dentro" : status === "above" ? "Acima" : status === "below" ? "Abaixo" : "—"}
    </span>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span>
      <span className={`mr-1.5 inline-block h-2 w-2 rounded-sm ${className}`} />
      {label}
    </span>
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

/* ─── date helpers (a data é um dia-calendário YYYY-MM-DD) ─── */

function weekdayLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" })
    .format(date)
    .replace(".", "");
}

function dayMonthLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(date);
}
