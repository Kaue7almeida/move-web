"use client";

import { Check, X } from "lucide-react";

/**
 * Premium "correct vs incorrect" comparison for a prep topic.
 * Remote assets are rendered via CSS background-image (no <img>, no next/image
 * domain config needed).
 */
export function ScanCompareCard({
  title,
  description,
  correctImageUrl,
  incorrectImageUrl,
}: {
  title: string;
  description: string;
  correctImageUrl: string;
  incorrectImageUrl: string;
}) {
  return (
    <div className="card-themed rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div
          role="img"
          aria-label={`${title} — correto`}
          className="relative aspect-[3/4] overflow-hidden rounded-xl border border-success/30 bg-surface-strong bg-cover bg-center ring-1 ring-success/20"
          style={{ backgroundImage: `url("${correctImageUrl}")` }}
        >
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
            <Check size={11} strokeWidth={3} />
            Correto
          </span>
        </div>

        <div
          role="img"
          aria-label={`${title} — incorreto`}
          className="relative aspect-[3/4] overflow-hidden rounded-xl border border-red-500/20 bg-surface-strong bg-cover bg-center"
          style={{ backgroundImage: `url("${incorrectImageUrl}")` }}
        >
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-500">
            <X size={11} strokeWidth={3} />
            Evite
          </span>
        </div>
      </div>
    </div>
  );
}
