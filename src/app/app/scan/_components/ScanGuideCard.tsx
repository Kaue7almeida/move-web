"use client";

/**
 * Pose guidance for a photo step: official reference image + instruction.
 * Remote asset via CSS background-image (contain, so the full figure shows).
 */
export function ScanGuideCard({
  title,
  instruction,
  imageUrl,
}: {
  title: string;
  instruction: string;
  imageUrl: string;
}) {
  return (
    <div className="card-themed rounded-2xl border border-border bg-surface p-4">
      <div className="flex gap-4">
        <div
          role="img"
          aria-label={`Pose de referência — ${title}`}
          className="h-40 w-28 shrink-0 rounded-xl border border-border bg-surface-strong bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${imageUrl}")` }}
        />
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
            Pose de referência
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{instruction}</p>
        </div>
      </div>
    </div>
  );
}
