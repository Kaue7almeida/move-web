"use client";

import type { ScanBand } from "../_types";

const BAND_CHIP_CLASS: Record<ScanBand, string> = {
  saudavel: "bg-success-soft text-success",
  atencao: "bg-accent/10 text-accent",
  neutro: "bg-surface-strong text-muted",
};

export function ScanMetricCard({
  label,
  value,
  unit,
  band,
  bandLabel,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  band: ScanBand;
  bandLabel?: string;
  hint?: string;
}) {
  return (
    <div className="card-themed rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted">{label}</p>
        {bandLabel && (
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${BAND_CHIP_CLASS[band]}`}
          >
            {bandLabel}
          </span>
        )}
      </div>

      <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-muted">{unit}</span>}
      </p>

      {hint && <p className="mt-1 text-[11px] leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}
