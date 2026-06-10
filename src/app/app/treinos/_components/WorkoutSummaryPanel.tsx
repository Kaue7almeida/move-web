import { Dumbbell, Layers } from "lucide-react";

import { summarizeWorkout, type StudioExerciseItem } from "./studio-types";

export function WorkoutSummaryPanel({
  items,
  compact = false,
}: {
  items: StudioExerciseItem[];
  compact?: boolean;
}) {
  const summary = summarizeWorkout(items);

  if (compact) {
    if (summary.exerciseCount === 0) {
      return null;
    }

    return (
      <div className="card-themed flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-border bg-surface px-4 py-2.5">
        <span className="text-xs font-medium text-foreground">
          {summary.exerciseCount} exercício{summary.exerciseCount !== 1 ? "s" : ""}
        </span>
        <span className="text-border">·</span>
        <span className="text-xs text-muted">
          {summary.totalSets} série{summary.totalSets !== 1 ? "s" : ""}
        </span>
        {summary.muscles.length > 0 && (
          <>
            <span className="text-border">·</span>
            {summary.muscles.map((muscle) => (
              <span
                key={muscle}
                className="inline-flex items-center rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent"
              >
                {muscle}
              </span>
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    <section className="card-themed rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">Resumo</h2>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-background px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-muted">
            <Dumbbell size={13} strokeWidth={1.8} />
            <span className="text-[11px] font-medium">Exercícios</span>
          </div>
          <p className="mt-1 text-lg font-bold text-foreground">{summary.exerciseCount}</p>
        </div>
        <div className="rounded-lg bg-background px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-muted">
            <Layers size={13} strokeWidth={1.8} />
            <span className="text-[11px] font-medium">Séries</span>
          </div>
          <p className="mt-1 text-lg font-bold text-foreground">{summary.totalSets}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Grupos musculares
        </p>
        {summary.muscles.length === 0 ? (
          <p className="mt-2 text-xs text-muted">Adicione exercícios para ver os grupos.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {summary.muscles.map((muscle) => (
              <span
                key={muscle}
                className="inline-flex items-center rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent"
              >
                {muscle}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
