"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import type { ScanDelta } from "../_types";

function formatSigned(value: number, digits: number): string {
  const abs = Math.abs(value).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

  if (value > 0) {
    return `+${abs}`;
  }

  if (value < 0) {
    return `−${abs}`;
  }

  return abs;
}

function DeltaChip({ label, value, unit }: { label: string; value: number; unit: string }) {
  const Icon = value < 0 ? ArrowDownRight : value > 0 ? ArrowUpRight : Minus;

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1.5">
      <Icon size={13} className="shrink-0 text-muted" />
      <span className="text-[11px] text-muted">{label}</span>
      <span className="text-xs font-semibold text-foreground">
        {formatSigned(value, 1)} {unit}
      </span>
    </div>
  );
}

/** Neutral delta chips (no good/bad coloring — body goals vary). */
export function ScanDeltaRow({ delta }: { delta: ScanDelta }) {
  return (
    <div className="flex flex-wrap gap-2">
      <DeltaChip label="Gordura" value={delta.bodyFatPercentDelta} unit="p.p." />
      <DeltaChip label="Peso" value={delta.weightKgDelta} unit="kg" />
      <DeltaChip label="Massa magra" value={delta.leanMassKgDelta} unit="kg" />
    </div>
  );
}
