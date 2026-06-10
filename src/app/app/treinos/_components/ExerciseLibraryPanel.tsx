"use client";

import { useMemo, useState } from "react";
import { Check, Plus, RefreshCw, Search } from "lucide-react";

import type { ExerciseListItem } from "@/bff/modules/workouts/types";

import { ExerciseThumbnail } from "./ExerciseThumbnail";
import {
  MAX_WORKOUT_EXERCISES,
  coverUrlFor,
  formatEquipment,
  formatMuscle,
} from "./studio-types";

type FilterOption = { value: string; label: string };

function buildOptions(
  values: Array<string | null>,
  format: (value: string) => string,
): FilterOption[] {
  const seen = new Set<string>();

  for (const value of values) {
    if (value) {
      seen.add(value);
    }
  }

  return Array.from(seen)
    .map((value) => ({ value, label: format(value) }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
}

const selectClassName =
  "h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20 disabled:opacity-50";

export function ExerciseLibraryPanel({
  exercises,
  isLoading,
  libraryError,
  onRetry,
  addedCountById,
  canAdd,
  onAdd,
  onPreview,
}: {
  exercises: ExerciseListItem[];
  isLoading: boolean;
  libraryError: string | null;
  onRetry: () => void;
  addedCountById: Map<string, number>;
  canAdd: boolean;
  onAdd: (exercise: ExerciseListItem) => void;
  onPreview: (exercise: ExerciseListItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("all");
  const [equipment, setEquipment] = useState("all");

  const muscleOptions = useMemo(
    () => buildOptions(exercises.map((ex) => ex.primary_muscle), formatMuscle),
    [exercises],
  );
  const equipmentOptions = useMemo(
    () => buildOptions(exercises.map((ex) => ex.equipment), formatEquipment),
    [exercises],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (muscle !== "all" && ex.primary_muscle !== muscle) {
        return false;
      }

      if (equipment !== "all" && ex.equipment !== equipment) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        ex.name.toLowerCase().includes(normalizedSearch)
        || (ex.primary_muscle?.toLowerCase().includes(normalizedSearch) ?? false)
        || (ex.equipment?.toLowerCase().includes(normalizedSearch) ?? false)
      );
    });
  }, [exercises, muscle, equipment, normalizedSearch]);

  return (
    <section className="card-themed flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Biblioteca</h2>
          <span className="text-[11px] text-muted">
            {isLoading ? "..." : `${filtered.length}/${exercises.length}`}
          </span>
        </div>

        <div className="relative mt-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={isLoading ? "Carregando exercícios..." : "Buscar exercício..."}
            disabled={isLoading}
            aria-label="Buscar exercício"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/40 focus:ring-1 focus:ring-accent/20 disabled:opacity-50"
          />
        </div>

        <div className="mt-2 flex gap-2">
          <select
            value={muscle}
            onChange={(event) => setMuscle(event.target.value)}
            disabled={isLoading}
            aria-label="Filtrar por grupo muscular"
            className={selectClassName}
          >
            <option value="all">Todos os músculos</option>
            {muscleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={equipment}
            onChange={(event) => setEquipment(event.target.value)}
            disabled={isLoading}
            aria-label="Filtrar por equipamento"
            className={selectClassName}
          >
            <option value="all">Todos equipamentos</option>
            {equipmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-2 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : libraryError ? (
          <div className="flex flex-col items-center gap-3 px-3 py-10 text-center">
            <p className="text-xs text-red-500">{libraryError}</p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <RefreshCw size={12} />
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-10 text-center text-xs text-muted">
            Nenhum exercício encontrado com esses filtros.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((exercise) => {
              const count = addedCountById.get(exercise.id) ?? 0;
              const addDisabled = !canAdd;

              return (
                <li key={exercise.id}>
                  {/* Outer wrapper: unified hover state for the row */}
                  <div className="group flex items-center gap-1.5 rounded-lg border border-transparent p-1.5 transition-colors hover:border-border hover:bg-surface-hover">
                    {/* Left clickable area: opens preview */}
                    <button
                      type="button"
                      onClick={() => onPreview(exercise)}
                      aria-label={`Ver detalhes de ${exercise.name}`}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <ExerciseThumbnail
                        imageUrl={coverUrlFor({
                          thumbnailUrl: exercise.thumbnailUrl,
                          imageStartUrl: exercise.imageStartUrl,
                        })}
                        imageEndUrl={exercise.imageEndUrl}
                        name={exercise.name}
                        animate={exercise.mediaType === "image_pair"}
                        className="h-11 w-11 shrink-0 rounded-lg"
                        iconSize={16}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground group-hover:text-foreground">
                          {exercise.name}
                        </p>
                        <p className="truncate text-[11px] text-muted">
                          {formatMuscle(exercise.primary_muscle)} · {formatEquipment(exercise.equipment)}
                        </p>
                      </div>
                    </button>

                    {/* Added count badge */}
                    {count > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                        <Check size={10} strokeWidth={2.5} />
                        {count}
                      </span>
                    )}

                    {/* Add button — can be disabled independently of preview */}
                    <button
                      type="button"
                      onClick={() => onAdd(exercise)}
                      disabled={addDisabled}
                      aria-label={`Adicionar ${exercise.name} ao treino`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-strong text-muted transition-colors hover:bg-accent hover:text-accent-on disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface-strong disabled:hover:text-muted"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!canAdd && (
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted">
          Limite de {MAX_WORKOUT_EXERCISES} exercícios atingido.
        </p>
      )}
    </section>
  );
}
