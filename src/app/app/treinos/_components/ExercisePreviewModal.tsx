"use client";

import { Plus, X } from "lucide-react";

import { ExerciseThumbnail } from "./ExerciseThumbnail";
import { formatEquipment, formatMuscle, type PreviewExercise } from "./studio-types";

export function ExercisePreviewModal({
  exercise,
  canAdd = false,
  onAdd,
  onClose,
}: {
  exercise: PreviewExercise;
  canAdd?: boolean;
  onAdd?: () => void;
  onClose: () => void;
}) {
  const hasImagePair =
    exercise.mediaType === "image_pair" &&
    exercise.imageStartUrl !== null &&
    exercise.imageEndUrl !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
        onKeyDown={() => {}}
      />

      {/* Panel */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold leading-snug text-foreground">
              {exercise.name}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                {formatMuscle(exercise.primaryMuscle)}
              </span>
              <span className="inline-flex items-center rounded-md bg-surface-strong px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {formatEquipment(exercise.equipment)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Media — animates automatically for image_pair; static otherwise */}
        <div className="overflow-hidden bg-surface-strong">
          <ExerciseThumbnail
            imageUrl={exercise.imageStartUrl}
            imageEndUrl={exercise.imageEndUrl}
            name={exercise.name}
            animate={hasImagePair}
            className="h-56 w-full sm:h-72"
            iconSize={44}
          />
        </div>

        {/* Description */}
        {exercise.description && (
          <div className="px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Descrição
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {exercise.description}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-6 pt-4">
          {canAdd && onAdd && (
            <button
              type="button"
              onClick={() => {
                onAdd();
                onClose();
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover"
            >
              <Plus size={15} />
              Adicionar ao treino
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={[
              "inline-flex items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover",
              canAdd && onAdd ? "shrink-0" : "flex-1",
            ].join(" ")}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
