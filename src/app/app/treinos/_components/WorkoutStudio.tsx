"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

import type {
  AssignCustomizedWorkoutToStudentInput,
  ExerciseListItem,
  StudentWorkoutSummary,
  WorkoutTemplateDetail,
} from "@/bff/modules/workouts/types";
import {
  UnauthenticatedRequestError,
  authenticatedFetch,
  readApiErrorMessage,
} from "@/services/api/authenticatedFetch";

import { ExerciseLibraryPanel } from "./ExerciseLibraryPanel";
import { ExercisePreviewModal } from "./ExercisePreviewModal";
import { WorkoutCanvasPanel } from "./WorkoutCanvasPanel";
import { WorkoutSummaryPanel } from "./WorkoutSummaryPanel";
import {
  MAX_WORKOUT_EXERCISES,
  buildWorkoutPayload,
  createStudioItem,
  createStudioItemFromTemplate,
  createStudioKey,
  hydrateStudioItemFromLibrary,
  type PreviewExercise,
  type StudioExerciseField,
  type StudioExerciseItem,
} from "./studio-types";

type PreviewTarget = {
  exercise: PreviewExercise;
  /** Set only when opened from the library — signals to show "Adicionar" button. */
  exerciseIdToAdd?: string;
};

type MobileStudioStep = "details" | "library" | "review";

const MOBILE_STEPS: ReadonlyArray<{
  key: MobileStudioStep;
  label: string;
  helper: string;
}> = [
  {
    key: "details",
    label: "Dados do treino",
    helper: "Defina nome e descrição antes de começar.",
  },
  {
    key: "library",
    label: "Escolher exercícios",
    helper: "Busque, filtre e selecione o que entra no treino.",
  },
  {
    key: "review",
    label: "Revisar e configurar",
    helper: "Ajuste séries, reps, descanso e observações antes de salvar.",
  },
];

export type WorkoutStudioMode =
  | { kind: "create" }
  | { kind: "edit"; workout: WorkoutTemplateDetail }
  | {
    kind: "customizedAssign";
    workout: WorkoutTemplateDetail;
    student: {
      userId: string;
      fullName: string;
    };
  };

export type WorkoutStudioCompletedResult =
  | { kind: "create"; workout: WorkoutTemplateDetail }
  | { kind: "edit"; workout: WorkoutTemplateDetail }
  | { kind: "customizedAssign"; studentWorkout: StudentWorkoutSummary };

function WorkoutDetailsCard({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: {
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}) {
  return (
    <div className="card-themed rounded-xl border border-border bg-surface p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        Identificação do treino
      </p>

      {/* Nome — campo principal */}
      <div className="mt-4">
        <label
          htmlFor="workout-title"
          className="mb-1.5 block text-sm font-semibold text-foreground"
        >
          Nome do treino
        </label>
        <input
          id="workout-title"
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Ex.: Treino A — Pernas e glúteos"
          className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-base font-semibold tracking-tight text-foreground outline-none transition placeholder:font-normal placeholder:text-muted/70 focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
        />
      </div>

      {/* Separador para deixar claro onde termina o título e começa a descrição */}
      <div className="my-4 border-t border-border" />

      {/* Descrição — campo secundário */}
      <div>
        <label
          htmlFor="workout-description"
          className="mb-1.5 block text-sm font-medium text-muted-foreground"
        >
          Descrição ou orientação geral{" "}
          <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea
          id="workout-description"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          rows={3}
          placeholder="Use este campo para explicar o foco do treino, observações ou cuidados."
          className="w-full resize-y rounded-lg border border-border bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
        />
      </div>
    </div>
  );
}

function MobileStepIndicator({
  currentStep,
  onStepChange,
  canOpenLibrary,
  canOpenReview,
  isSaving,
}: {
  currentStep: MobileStudioStep;
  onStepChange: (step: MobileStudioStep) => void;
  canOpenLibrary: boolean;
  canOpenReview: boolean;
  isSaving: boolean;
}) {
  const currentIndex = MOBILE_STEPS.findIndex((step) => step.key === currentStep);
  const currentMeta = MOBILE_STEPS[currentIndex] ?? MOBILE_STEPS[0];

  return (
    <div className="card-themed rounded-xl border border-border bg-surface p-3">
      <div className="grid grid-cols-3 gap-2">
        {MOBILE_STEPS.map((step, index) => {
          const isActive = step.key === currentStep;
          const isComplete = index < currentIndex;
          const canOpen =
            !isSaving
            && (step.key === "details"
              || (step.key === "library" && canOpenLibrary)
              || (step.key === "review" && canOpenReview));

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onStepChange(step.key)}
              disabled={!canOpen}
              className={[
                "flex min-w-0 flex-col items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                isActive
                  ? "border-accent/30 bg-accent-soft text-accent"
                  : isComplete
                    ? "border-border bg-background text-foreground hover:bg-surface-hover"
                    : "border-border bg-background text-muted hover:bg-surface-hover",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  isActive
                    ? "bg-accent text-accent-on"
                    : isComplete
                      ? "bg-accent-muted text-accent"
                      : "bg-surface-strong text-muted",
                ].join(" ")}
              >
                {isComplete ? <Check size={13} /> : index + 1}
              </span>
              <span className="text-xs font-semibold leading-tight">{step.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
          Etapa {currentIndex + 1} de 3
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">{currentMeta.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{currentMeta.helper}</p>
      </div>
    </div>
  );
}

function SelectedExercisesPreview({ items }: { items: StudioExerciseItem[] }) {
  const previewItems = items.slice(0, 4);
  const remainingCount = items.length - previewItems.length;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {previewItems.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2"
        >
          <p className="min-w-0 truncate text-sm font-medium text-foreground">{item.name}</p>
          <span className="shrink-0 text-[11px] text-muted">{item.setsCount} séries</span>
        </div>
      ))}

      {remainingCount > 0 && (
        <p className="rounded-lg bg-background px-3 py-2 text-xs text-muted">
          +{remainingCount} exercício{remainingCount !== 1 ? "s" : ""} na seleção
        </p>
      )}
    </div>
  );
}

function SaveButton({
  isSaving,
  onSave,
  label,
  loadingLabel,
  className = "",
}: {
  isSaving: boolean;
  onSave: () => void;
  label: string;
  loadingLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={isSaving}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {isSaving ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <Check size={15} />
      )}
      {isSaving ? loadingLabel : label}
    </button>
  );
}

export function WorkoutStudio({
  mode,
  onCompleted,
  onCancel,
}: {
  mode: WorkoutStudioMode;
  onCompleted: (result: WorkoutStudioCompletedResult) => void;
  onCancel: () => void;
}) {
  const isCreateMode = mode.kind === "create";
  const isEditMode = mode.kind === "edit";
  const isCustomizedAssignMode = mode.kind === "customizedAssign";
  const usesTemplateSeed = !isCreateMode;
  const [mobileStep, setMobileStep] = useState<MobileStudioStep>("details");
  const [title, setTitle] = useState(usesTemplateSeed ? mode.workout.title : "");
  const [description, setDescription] = useState(
    usesTemplateSeed ? (mode.workout.description ?? "") : "",
  );
  const [items, setItems] = useState<StudioExerciseItem[]>(() =>
    usesTemplateSeed
      ? mode.workout.exercises.map((exercise) => createStudioItemFromTemplate(exercise))
      : [],
  );

  const [library, setLibrary] = useState<ExerciseListItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadExercises() {
      try {
        const response = await authenticatedFetch("/api/v1/exercises", { method: "GET" });

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setLibraryError("Não foi possível carregar os exercícios.");
          setIsLoadingLibrary(false);
          return;
        }

        const payload = (await response.json()) as { items: ExerciseListItem[] };

        if (isMounted) {
          setLibrary(payload.items);
          setIsLoadingLibrary(false);
        }
      } catch {
        if (isMounted) {
          setLibraryError("Não foi possível carregar os exercícios.");
          setIsLoadingLibrary(false);
        }
      }
    }

    void loadExercises();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  function handleRetryLibrary() {
    setLibrary([]);
    setLibraryError(null);
    setIsLoadingLibrary(true);
    setRetryCount((c) => c + 1);
  }

  const addedCountById = useMemo(() => {
    const map = new Map<string, number>();

    for (const item of items) {
      map.set(item.exerciseId, (map.get(item.exerciseId) ?? 0) + 1);
    }

    return map;
  }, [items]);

  const displayItems = useMemo(() => {
    if (!usesTemplateSeed || library.length === 0) {
      return items;
    }

    const libraryById = new Map(library.map((exercise) => [exercise.id, exercise]));

    return items.map((item) => {
      const libraryExercise = libraryById.get(item.exerciseId);

      return libraryExercise ? hydrateStudioItemFromLibrary(item, libraryExercise) : item;
    });
  }, [usesTemplateSeed, items, library]);

  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  const canContinueToLibrary = trimmedTitle.length > 0;
  const canReviewOnMobile = items.length > 0;
  const canAdd = items.length < MAX_WORKOUT_EXERCISES;
  const saveButtonLabel = isCustomizedAssignMode
    ? "Enviar treino personalizado"
    : isEditMode
      ? "Salvar alterações"
      : "Salvar treino";
  const saveButtonLoadingLabel = isCustomizedAssignMode ? "Enviando..." : "Salvando...";
  const saveErrorFallback = isCustomizedAssignMode
    ? "Não foi possível enviar o treino personalizado."
    : "Não foi possível salvar o treino.";

  function handleAdd(exercise: ExerciseListItem) {
    setItems((prev) =>
      prev.length >= MAX_WORKOUT_EXERCISES ? prev : [...prev, createStudioItem(exercise)],
    );
  }

  function handleChangeField(key: string, field: StudioExerciseField, value: string) {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    );
  }

  function moveItem(key: string, direction: -1 | 1) {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.key === key);
      const target = index + direction;

      if (index < 0 || target < 0 || target >= prev.length) {
        return prev;
      }

      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleDuplicate(key: string) {
    setItems((prev) => {
      if (prev.length >= MAX_WORKOUT_EXERCISES) {
        return prev;
      }

      const index = prev.findIndex((item) => item.key === key);

      if (index < 0) {
        return prev;
      }

      const source = prev[index];
      const clone: StudioExerciseItem = { ...source, key: createStudioKey() };
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
  }

  function handleRemove(key: string) {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  /* ── Preview handlers ── */

  function handlePreviewLibrary(exercise: ExerciseListItem) {
    setPreviewTarget({
      exercise: {
        name: exercise.name,
        primaryMuscle: exercise.primary_muscle,
        equipment: exercise.equipment,
        description: exercise.description,
        mediaType: exercise.mediaType,
        imageStartUrl: exercise.imageStartUrl,
        imageEndUrl: exercise.imageEndUrl,
      },
      exerciseIdToAdd: exercise.id,
    });
  }

  function handlePreviewCanvas(key: string) {
    const item = displayItems.find((i) => i.key === key);

    if (!item) {
      return;
    }

    setPreviewTarget({
      exercise: {
        name: item.name,
        primaryMuscle: item.primaryMuscle,
        equipment: item.equipment,
        description: item.description,
        mediaType: item.mediaType,
        imageStartUrl: item.imageStartUrl,
        imageEndUrl: item.imageEndUrl,
      },
    });
  }

  function handleAddFromPreview() {
    if (!previewTarget?.exerciseIdToAdd) {
      return;
    }

    const exercise = library.find((ex) => ex.id === previewTarget.exerciseIdToAdd);

    if (exercise) {
      handleAdd(exercise);
    }
  }

  /* ── Save ── */

  async function handleSave() {
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Dê um nome ao treino.");
      return;
    }

    if (items.length === 0) {
      setErrorMessage("Adicione pelo menos um exercício.");
      return;
    }

    for (const item of items) {
      const sets = Number.parseInt(item.setsCount, 10);

      if (!Number.isFinite(sets) || sets < 1) {
        setErrorMessage(`"${item.name}": informe as séries.`);
        return;
      }

      if (!item.repsText.trim()) {
        setErrorMessage(`"${item.name}": informe as repetições.`);
        return;
      }
    }

    setIsSaving(true);

    try {
      const workoutPayload = buildWorkoutPayload(
        title,
        description,
        items,
        isCreateMode ? { status: "active" } : undefined,
      );
      const requestConfig: RequestInit = {
        headers: { "Content-Type": "application/json" },
      };

      let response: Response;

      if (isCreateMode) {
        response = await authenticatedFetch("/api/v1/trainer/workouts", {
          ...requestConfig,
          method: "POST",
          body: JSON.stringify(workoutPayload),
        });
      } else if (isEditMode) {
        response = await authenticatedFetch(`/api/v1/trainer/workouts/${mode.workout.id}`, {
          ...requestConfig,
          method: "PUT",
          body: JSON.stringify(workoutPayload),
        });
      } else {
        const customizedPayload: AssignCustomizedWorkoutToStudentInput = {
          studentUserId: mode.student.userId,
          title: workoutPayload.title,
          ...(workoutPayload.description ? { description: workoutPayload.description } : {}),
          exercises: workoutPayload.exercises,
        };

        response = await authenticatedFetch(
          `/api/v1/trainer/workouts/${mode.workout.id}/assign/customized`,
          {
            ...requestConfig,
            method: "POST",
            body: JSON.stringify(customizedPayload),
          },
        );
      }

      if (response.status === 401) {
        throw new UnauthenticatedRequestError();
      }

      if (!response.ok) {
        setErrorMessage(await readApiErrorMessage(response, saveErrorFallback));
        return;
      }

      if (isCustomizedAssignMode) {
        const payload = (await response.json()) as { studentWorkout: StudentWorkoutSummary };
        onCompleted({ kind: "customizedAssign", studentWorkout: payload.studentWorkout });
        return;
      }

      const payload = (await response.json()) as { workout: WorkoutTemplateDetail };
      onCompleted({ kind: isEditMode ? "edit" : "create", workout: payload.workout });
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof UnauthenticatedRequestError
          ? "Sua sessão expirou. Entre novamente."
          : saveErrorFallback,
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-4 lg:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-strong px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-60"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        <SaveButton
          isSaving={isSaving}
          onSave={handleSave}
          label={saveButtonLabel}
          loadingLabel={saveButtonLoadingLabel}
          className="hidden lg:inline-flex"
        />
      </div>

      {isCustomizedAssignMode && (
        <div className="card-themed rounded-xl border border-accent/20 bg-accent/5 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-accent">
            Personalização para aluno
          </p>
          <h2 className="mt-1 text-base font-semibold text-foreground">
            Personalizando para {mode.student.fullName}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Esta alteração não muda o modelo original.
          </p>
        </div>
      )}

      <div className="space-y-4 lg:hidden">
        <MobileStepIndicator
          currentStep={mobileStep}
          onStepChange={setMobileStep}
          canOpenLibrary={canContinueToLibrary}
          canOpenReview={canReviewOnMobile}
          isSaving={isSaving}
        />

        {mobileStep === "details" && (
          <>
            <WorkoutDetailsCard
              title={title}
              description={description}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
            />

            <div className="card-themed rounded-xl border border-border bg-surface p-3">
              <p className="text-xs leading-relaxed text-muted">
                {isCustomizedAssignMode
                  ? "Revise o nome e a descrição antes de montar a versão final para o aluno."
                  : "Dê um nome ao treino para seguir para a escolha dos exercícios."}
              </p>
              <button
                type="button"
                onClick={() => setMobileStep("library")}
                disabled={!canContinueToLibrary || isSaving}
                className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {mobileStep === "library" && (
          <>
            <div className="card-themed rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Escolher exercícios</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Use a busca, os filtros e a demonstração para montar a seleção.
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                  {items.length}
                </span>
              </div>

              <p className="mt-3 text-sm font-semibold text-foreground">
                {items.length} exercício{items.length !== 1 ? "s" : ""} selecionado
                {items.length !== 1 ? "s" : ""}
              </p>
              <p className="mt-1 text-xs text-muted">
                Os itens adicionados ficam salvos para a revisão e configuração final.
              </p>

              <SelectedExercisesPreview items={displayItems} />
            </div>

            <ExerciseLibraryPanel
              exercises={library}
              isLoading={isLoadingLibrary}
              libraryError={libraryError}
              onRetry={handleRetryLibrary}
              addedCountById={addedCountById}
              canAdd={canAdd}
              onAdd={handleAdd}
              onPreview={handlePreviewLibrary}
            />

            <div className="card-themed rounded-xl border border-border bg-surface p-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMobileStep("details")}
                  disabled={isSaving}
                  className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-surface-strong px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-60"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setMobileStep("review")}
                  disabled={!canReviewOnMobile || isSaving}
                  className="inline-flex flex-1 items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Revisar treino
                </button>
              </div>

              {!canReviewOnMobile && (
                <p className="mt-2 text-xs text-muted">
                  Selecione pelo menos um exercício para seguir para a revisão.
                </p>
              )}
            </div>
          </>
        )}

        {mobileStep === "review" && (
          <>
            <div className="card-themed rounded-xl border border-border bg-surface p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                {isCustomizedAssignMode ? "Treino personalizado em revisão" : "Treino em revisão"}
              </p>
              <h2 className="mt-1 text-base font-semibold text-foreground">
                {trimmedTitle || "Treino sem nome"}
              </h2>
              {trimmedDescription && (
                <p className="mt-1 text-sm leading-relaxed text-muted">{trimmedDescription}</p>
              )}
            </div>

            <WorkoutSummaryPanel items={displayItems} compact />
            <WorkoutCanvasPanel
              items={displayItems}
              onChangeField={handleChangeField}
              onMoveUp={(key) => moveItem(key, -1)}
              onMoveDown={(key) => moveItem(key, 1)}
              onDuplicate={handleDuplicate}
              onRemove={handleRemove}
              onPreview={handlePreviewCanvas}
              fieldIdPrefix="mobile"
            />

            <div className="card-themed rounded-xl border border-border bg-surface p-3">
              {errorMessage && (
                <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-xs text-red-500">
                  {errorMessage}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setMobileStep("library")}
                  disabled={isSaving}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface-strong px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-60"
                >
                  Adicionar mais exercícios
                </button>
                <SaveButton
                  isSaving={isSaving}
                  onSave={handleSave}
                  label={saveButtonLabel}
                  loadingLabel={saveButtonLoadingLabel}
                  className="w-full"
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="hidden lg:block">
        <WorkoutDetailsCard
          title={title}
          description={description}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
        />
      </div>

      {errorMessage && (
        <div className="hidden rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-xs text-red-500 lg:block">
          {errorMessage}
        </div>
      )}

      <div className="hidden gap-4 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div>
          <div className="lg:sticky lg:top-4">
            <ExerciseLibraryPanel
              exercises={library}
              isLoading={isLoadingLibrary}
              libraryError={libraryError}
              onRetry={handleRetryLibrary}
              addedCountById={addedCountById}
              canAdd={canAdd}
              onAdd={handleAdd}
              onPreview={handlePreviewLibrary}
            />
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <WorkoutSummaryPanel items={displayItems} compact />
          <WorkoutCanvasPanel
            items={displayItems}
            onChangeField={handleChangeField}
            onMoveUp={(key) => moveItem(key, -1)}
            onMoveDown={(key) => moveItem(key, 1)}
            onDuplicate={handleDuplicate}
            onRemove={handleRemove}
            onPreview={handlePreviewCanvas}
            fieldIdPrefix="desktop"
          />
        </div>
      </div>

      {previewTarget && (
        <ExercisePreviewModal
          exercise={previewTarget.exercise}
          canAdd={previewTarget.exerciseIdToAdd !== undefined && canAdd}
          onAdd={handleAddFromPreview}
          onClose={() => setPreviewTarget(null)}
        />
      )}
    </div>
  );
}
