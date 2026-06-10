"use client";

export function ScanStepper({
  steps,
  currentIndex,
  subLabel,
}: {
  steps: readonly { readonly key: string; readonly title: string }[];
  currentIndex: number;
  /** When inside a multi-part step (e.g. "Preparação"), shows "2 de 6" alongside the title. */
  subLabel?: string;
}) {
  const total = steps.length;
  const safeIndex = Math.min(Math.max(currentIndex, 0), total - 1);
  const current = steps[safeIndex];
  const percent = Math.round(((safeIndex + 1) / total) * 100);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">
          {current?.title}
          {subLabel && (
            <span className="ml-1.5 text-xs font-normal text-muted">· {subLabel}</span>
          )}
        </p>
        <p className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted">
          Passo {safeIndex + 1} de {total}
        </p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-strong">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
