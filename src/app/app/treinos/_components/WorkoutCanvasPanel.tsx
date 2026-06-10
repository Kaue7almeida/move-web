import { ArrowDown, ArrowUp, Copy, Dumbbell, Trash2 } from "lucide-react";

import { ExerciseThumbnail } from "./ExerciseThumbnail";
import {
  coverUrlFor,
  formatEquipment,
  formatMuscle,
  type StudioExerciseField,
  type StudioExerciseItem,
} from "./studio-types";

const fieldClassName =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/40 focus:ring-1 focus:ring-accent/20";

const labelClassName = "mb-1 block text-[11px] font-medium text-muted";

const controlClassName =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";

export function WorkoutCanvasPanel({
  items,
  onChangeField,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  onPreview,
  fieldIdPrefix = "canvas",
}: {
  items: StudioExerciseItem[];
  onChangeField: (key: string, field: StudioExerciseField, value: string) => void;
  onMoveUp: (key: string) => void;
  onMoveDown: (key: string) => void;
  onDuplicate: (key: string) => void;
  onRemove: (key: string) => void;
  onPreview: (key: string) => void;
  fieldIdPrefix?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-muted text-accent">
          <Dumbbell size={22} strokeWidth={1.6} />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-foreground">Monte o treino</h3>
        <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted">
          Clique em um exercício da biblioteca para adicioná-lo. Ele aparece aqui para você
          ajustar séries, repetições e descanso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <article
          key={item.key}
          className="card-themed rounded-xl border border-border bg-surface p-3 sm:p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <button
              type="button"
              onClick={() => onPreview(item.key)}
              aria-label={`Ver detalhes de ${item.name}`}
              className="group/preview flex min-w-0 flex-1 items-start gap-3 text-left"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-on">
                {index + 1}
              </span>
              <ExerciseThumbnail
                imageUrl={coverUrlFor(item)}
                name={item.name}
                className="h-16 w-16 shrink-0 rounded-xl"
                iconSize={20}
              />
              <div className="min-w-0 pt-0.5">
                <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover/preview:text-accent">
                  {item.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted">
                  {formatMuscle(item.primaryMuscle)}
                  {item.equipment ? ` · ${formatEquipment(item.equipment)}` : ""}
                </p>
                <p className="mt-1.5 text-[10px] font-medium text-accent/70 opacity-0 transition-opacity group-hover/preview:opacity-100">
                  Ver demonstração →
                </p>
              </div>
            </button>

            <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto sm:pt-0.5">
              <button
                type="button"
                onClick={() => onMoveUp(item.key)}
                disabled={index === 0}
                aria-label="Mover para cima"
                className={controlClassName}
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => onMoveDown(item.key)}
                disabled={index === items.length - 1}
                aria-label="Mover para baixo"
                className={controlClassName}
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                onClick={() => onDuplicate(item.key)}
                aria-label="Duplicar exercício"
                className={controlClassName}
              >
                <Copy size={14} />
              </button>
              <button
                type="button"
                onClick={() => onRemove(item.key)}
                aria-label="Remover exercício"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <label className={labelClassName} htmlFor={`${fieldIdPrefix}-${item.key}-sets`}>
                Séries
              </label>
              <input
                id={`${fieldIdPrefix}-${item.key}-sets`}
                type="number"
                inputMode="numeric"
                min="1"
                max="20"
                value={item.setsCount}
                onChange={(event) => onChangeField(item.key, "setsCount", event.target.value)}
                className={fieldClassName}
                placeholder="3"
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor={`${fieldIdPrefix}-${item.key}-reps`}>
                Repetições
              </label>
              <input
                id={`${fieldIdPrefix}-${item.key}-reps`}
                type="text"
                value={item.repsText}
                onChange={(event) => onChangeField(item.key, "repsText", event.target.value)}
                className={fieldClassName}
                placeholder="12"
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor={`${fieldIdPrefix}-${item.key}-rest`}>
                Descanso (s)
              </label>
              <input
                id={`${fieldIdPrefix}-${item.key}-rest`}
                type="number"
                inputMode="numeric"
                min="0"
                max="600"
                value={item.restSeconds}
                onChange={(event) => onChangeField(item.key, "restSeconds", event.target.value)}
                className={fieldClassName}
                placeholder="60"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className={labelClassName} htmlFor={`${fieldIdPrefix}-${item.key}-notes`}>
              Observações
            </label>
            <input
              id={`${fieldIdPrefix}-${item.key}-notes`}
              type="text"
              value={item.notes}
              onChange={(event) => onChangeField(item.key, "notes", event.target.value)}
              className={fieldClassName}
              placeholder="Ex: cadência lenta na descida"
            />
          </div>
        </article>
      ))}
    </div>
  );
}
