"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Dumbbell,
  FolderOpen,
  Loader2,
  Play,
  RefreshCw,
  Users,
} from "lucide-react";

import type {
  StudentGalleryDetail,
  StudentGalleryItem,
  StudentWorkoutSummary,
  WorkoutTemplateDetail,
  WorkoutTemplateSummary,
} from "@/bff/modules/workouts/types";
import {
  UnauthenticatedRequestError,
  authenticatedFetch,
  readApiErrorMessage,
} from "@/services/api/authenticatedFetch";

import { useAppShell } from "../AppShellContext";
import { PageHeader, EmptyState } from "../app-ui";
import { getRelationshipSummary } from "../app-utils";
import { ExerciseThumbnail } from "../treinos/_components/ExerciseThumbnail";
import { coverUrlFor, formatEquipment, formatMuscle } from "../treinos/_components/studio-types";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
};

function applyDetailToList(
  list: WorkoutTemplateSummary[],
  detail: WorkoutTemplateDetail,
): WorkoutTemplateSummary[] {
  return list.map((template) =>
    template.id === detail.id
      ? { ...template, isInGallery: detail.isInGallery, galleryCategory: detail.galleryCategory }
      : template,
  );
}

/* ─── Template card ─── */

function GalleryTemplateCard({
  template,
  categoryDraft,
  isSaving,
  onToggle,
  onCategoryDraftChange,
  onSaveCategory,
}: {
  template: WorkoutTemplateSummary;
  categoryDraft: string;
  isSaving: boolean;
  onToggle: () => void;
  onCategoryDraftChange: (value: string) => void;
  onSaveCategory: () => void;
}) {
  const categoryChanged = categoryDraft.trim() !== (template.galleryCategory ?? "").trim();

  return (
    <article className="card-themed rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{template.title}</p>
          {template.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted">{template.description}</p>
          )}
        </div>
        {template.isInGallery && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">
            <Check size={10} strokeWidth={2.5} />
            Na Galeria
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <span className="inline-flex items-center rounded-full bg-surface-strong px-2 py-0.5 font-medium text-muted-foreground">
          {STATUS_LABELS[template.status] ?? template.status}
        </span>
        <span>{template.exerciseCount} exercício{template.exerciseCount !== 1 ? "s" : ""}</span>
        {template.isInGallery && template.galleryCategory && (
          <span className="inline-flex items-center rounded-full bg-accent/8 px-2 py-0.5 font-semibold text-accent">
            {template.galleryCategory}
          </span>
        )}
      </div>

      {template.isInGallery && (
        <div className="mt-3 flex items-end gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-[11px] font-medium text-muted">Categoria / foco</span>
            <input
              type="text"
              value={categoryDraft}
              onChange={(event) => onCategoryDraftChange(event.target.value)}
              disabled={isSaving}
              placeholder="Ex: emagrecimento, abdômen, iniciante"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/40 focus:ring-1 focus:ring-accent/20 disabled:opacity-60"
            />
          </label>
          <button
            type="button"
            onClick={onSaveCategory}
            disabled={isSaving || !categoryChanged}
            className="inline-flex h-9 shrink-0 items-center rounded-lg bg-surface-strong px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={isSaving}
        className={[
          "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          template.isInGallery
            ? "border border-border bg-surface-strong text-foreground hover:bg-surface-hover"
            : "bg-accent text-accent-on hover:bg-accent-hover",
        ].join(" ")}
      >
        {isSaving ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <FolderOpen size={15} />
        )}
        {template.isInGallery ? "Remover da Galeria" : "Publicar na Galeria"}
      </button>
    </article>
  );
}

/* ─── Trainer gallery ─── */

function TrainerGallery() {
  const [templates, setTemplates] = useState<WorkoutTemplateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    async function loadTemplates() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await authenticatedFetch("/api/v1/trainer/workouts", { method: "GET" });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setErrorMessage(await readApiErrorMessage(response, "Não foi possível carregar seus treinos."));
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as { items: WorkoutTemplateSummary[] };

        if (isMounted) {
          setTemplates(payload.items);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível carregar seus treinos.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadTemplates();

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  async function patchGallery(
    workoutId: string,
    body: { isInGallery: boolean; galleryCategory?: string | null },
  ): Promise<void> {
    setSavingId(workoutId);
    setActionError(null);

    try {
      const response = await authenticatedFetch(`/api/v1/trainer/workouts/${workoutId}/gallery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.status === 401) {
        throw new UnauthenticatedRequestError();
      }

      if (!response.ok) {
        setActionError(await readApiErrorMessage(response, "Não foi possível atualizar a galeria."));
        return;
      }

      const payload = (await response.json()) as { workout: WorkoutTemplateDetail };
      setTemplates((current) => applyDetailToList(current, payload.workout));
      setCategoryDrafts((drafts) => ({
        ...drafts,
        [workoutId]: payload.workout.galleryCategory ?? "",
      }));
    } catch (error: unknown) {
      setActionError(
        error instanceof UnauthenticatedRequestError
          ? "Sua sessão expirou. Entre novamente."
          : "Não foi possível atualizar a galeria.",
      );
    } finally {
      setSavingId(null);
    }
  }

  function handleToggle(template: WorkoutTemplateSummary) {
    void patchGallery(template.id, { isInGallery: !template.isInGallery });
  }

  function handleSaveCategory(template: WorkoutTemplateSummary) {
    const draft = (categoryDrafts[template.id] ?? "").trim();
    void patchGallery(template.id, { isInGallery: true, galleryCategory: draft === "" ? null : draft });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Galeria"
        description="Publique treinos livres para seus alunos."
      />

      <div className="rounded-xl border border-border bg-surface px-4 py-3">
        <p className="text-xs leading-relaxed text-muted">
          Treinos publicados aqui ficam disponíveis como treinos livres para seus alunos vinculados.
          Eles não substituem treinos personalizados.
        </p>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-xs text-red-500">
          {actionError}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={20} className="animate-spin text-accent" />
            <p className="text-xs text-muted">Carregando treinos...</p>
          </div>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
          <p className="text-xs text-red-500">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <RefreshCw size={12} />
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && templates.length === 0 && (
        <EmptyState
          icon={Dumbbell}
          title="Você ainda não criou treinos"
          description="Crie um modelo de treino na área de Treinos. Depois você pode publicá-lo aqui como treino livre para seus alunos."
          action={{ label: "Criar treino", href: "/app/treinos" }}
        />
      )}

      {!isLoading && !errorMessage && templates.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((template) => (
            <GalleryTemplateCard
              key={template.id}
              template={template}
              categoryDraft={categoryDrafts[template.id] ?? template.galleryCategory ?? ""}
              isSaving={savingId === template.id}
              onToggle={() => handleToggle(template)}
              onCategoryDraftChange={(value) =>
                setCategoryDrafts((drafts) => ({ ...drafts, [template.id]: value }))
              }
              onSaveCategory={() => handleSaveCategory(template)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Student gallery ─── */

const STUDENT_GALLERY_DISCLAIMER =
  "Esses treinos são genéricos do seu personal e não substituem sua ficha personalizada.";

type StudentGalleryGroup = {
  trainerUserId: string;
  trainerName: string;
  items: StudentGalleryItem[];
};

function groupGalleryByTrainer(items: StudentGalleryItem[]): StudentGalleryGroup[] {
  const groups: StudentGalleryGroup[] = [];
  const indexByTrainer = new Map<string, number>();

  for (const item of items) {
    const existingIndex = indexByTrainer.get(item.trainerUserId);

    if (existingIndex === undefined) {
      indexByTrainer.set(item.trainerUserId, groups.length);
      groups.push({ trainerUserId: item.trainerUserId, trainerName: item.trainerName, items: [item] });
      continue;
    }

    groups[existingIndex].items.push(item);
  }

  return groups;
}

function StudentGalleryCard({
  item,
  onView,
}: {
  item: StudentGalleryItem;
  onView: (templateId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onView(item.templateId)}
      className="card-themed group flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-hover"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent">
        <FolderOpen size={20} strokeWidth={1.7} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
          {item.galleryCategory && (
            <span className="inline-flex items-center rounded-full bg-accent/8 px-2 py-0.5 font-semibold text-accent">
              {item.galleryCategory}
            </span>
          )}
          <span>
            {item.exerciseCount} exercício{item.exerciseCount !== 1 ? "s" : ""}
          </span>
        </div>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted">{item.description}</p>
        )}
      </div>

      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
        Ver detalhes
        <ChevronRight size={14} />
      </span>
    </button>
  );
}

function StudentGalleryExerciseRow({
  exercise,
  index,
}: {
  exercise: StudentGalleryDetail["exercises"][number];
  index: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-on">
          {index + 1}
        </span>
        <ExerciseThumbnail
          imageUrl={coverUrlFor({
            thumbnailUrl: exercise.thumbnailUrl,
            imageStartUrl: exercise.imageStartUrl,
          })}
          imageEndUrl={exercise.imageEndUrl}
          name={exercise.exerciseName}
          animate={exercise.mediaType === "image_pair"}
          className="h-14 w-14 shrink-0 rounded-lg"
          iconSize={20}
        />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate text-sm font-semibold text-foreground">{exercise.exerciseName}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted">
            {formatMuscle(exercise.primaryMuscle)}
            {exercise.equipment ? ` · ${formatEquipment(exercise.equipment)}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <div className="flex-1 rounded-lg bg-background px-3 py-2 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Séries</p>
          <p className="mt-0.5 text-base font-bold text-foreground">{exercise.setsCount}</p>
        </div>
        <div className="flex-1 rounded-lg bg-background px-3 py-2 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Reps</p>
          <p className="mt-0.5 text-base font-bold text-foreground">{exercise.repsText}</p>
        </div>
        <div className="flex-1 rounded-lg bg-background px-3 py-2 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Descanso</p>
          <p className="mt-0.5 text-base font-bold text-foreground">
            {exercise.restSeconds != null ? `${exercise.restSeconds}s` : "—"}
          </p>
        </div>
      </div>

      {exercise.notes && (
        <p className="mt-3 rounded-lg bg-accent/5 px-3 py-2 text-xs leading-relaxed text-muted">
          {exercise.notes}
        </p>
      )}
    </div>
  );
}

function StudentGalleryDetailView({
  templateId,
  onBack,
}: {
  templateId: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [template, setTemplate] = useState<StudentGalleryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTemplate() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await authenticatedFetch(`/api/v1/student/gallery/${templateId}`, {
          method: "GET",
        });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setErrorMessage(await readApiErrorMessage(response, "Não foi possível carregar o treino."));
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as { template: StudentGalleryDetail };

        if (isMounted) {
          setTemplate(payload.template);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível carregar o treino.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadTemplate();

    return () => {
      isMounted = false;
    };
  }, [templateId]);

  async function handleStart() {
    setIsStarting(true);
    setStartError(null);

    try {
      const response = await authenticatedFetch(`/api/v1/student/gallery/${templateId}/start`, {
        method: "POST",
      });

      if (response.status === 401) {
        throw new UnauthenticatedRequestError();
      }

      if (!response.ok) {
        setStartError(await readApiErrorMessage(response, "Não foi possível iniciar o treino."));
        setIsStarting(false);
        return;
      }

      const payload = (await response.json()) as { studentWorkout: StudentWorkoutSummary };

      // Reuse the existing guided-execution flow from /app/treinos: the new
      // student_workout is opened straight into execution via the `iniciar` param.
      router.push(`/app/treinos?iniciar=${payload.studentWorkout.id}`);
    } catch (error: unknown) {
      setStartError(
        error instanceof UnauthenticatedRequestError
          ? "Sua sessão expirou. Entre novamente."
          : "Não foi possível iniciar o treino.",
      );
      setIsStarting(false);
    }
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Voltar para a galeria
      </button>

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={20} className="animate-spin text-accent" />
            <p className="text-xs text-muted">Carregando treino...</p>
          </div>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
          <p className="text-xs text-red-500">{errorMessage}</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            Voltar para a galeria
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && template && (
        <>
          <div className="card-themed rounded-xl border border-border bg-surface p-5">
            {template.galleryCategory && (
              <span className="inline-flex items-center rounded-full bg-accent/8 px-2 py-0.5 text-[11px] font-semibold text-accent">
                {template.galleryCategory}
              </span>
            )}
            <h2 className="mt-2 text-lg font-bold text-foreground">{template.title}</h2>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted">
              <Users size={13} />
              {template.trainerName}
              <span aria-hidden="true">·</span>
              {template.exercises.length} exercício{template.exercises.length !== 1 ? "s" : ""}
            </p>
            {template.description && (
              <p className="mt-3 text-sm leading-relaxed text-muted">{template.description}</p>
            )}

            <div className="mt-4 rounded-lg border border-border bg-background px-3 py-2.5">
              <p className="text-[11px] leading-relaxed text-muted">{STUDENT_GALLERY_DISCLAIMER}</p>
            </div>

            {template.exercises.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => void handleStart()}
                  disabled={isStarting}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isStarting ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                  {isStarting ? "Iniciando..." : "Iniciar treino"}
                </button>
                {startError && <p className="mt-2 text-xs text-red-500">{startError}</p>}
              </>
            )}
          </div>

          {template.exercises.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="Treino sem exercícios"
              description="Este treino livre ainda não tem exercícios cadastrados pelo seu personal."
            />
          ) : (
            <div className="space-y-3">
              {template.exercises.map((exercise, index) => (
                <StudentGalleryExerciseRow
                  key={`${exercise.sortOrder}-${exercise.exerciseName}`}
                  exercise={exercise}
                  index={index}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StudentGallery() {
  const { me } = useAppShell();
  const activeTrainerCount = getRelationshipSummary(me).activeCount;

  const [items, setItems] = useState<StudentGalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGallery() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await authenticatedFetch("/api/v1/student/gallery", { method: "GET" });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setErrorMessage(await readApiErrorMessage(response, "Não foi possível carregar a galeria."));
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as { items: StudentGalleryItem[] };

        if (isMounted) {
          setItems(payload.items);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível carregar a galeria.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadGallery();

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  if (selectedTemplateId) {
    return (
      <StudentGalleryDetailView
        templateId={selectedTemplateId}
        onBack={() => setSelectedTemplateId(null)}
      />
    );
  }

  const groups = groupGalleryByTrainer(items);

  return (
    <div className="space-y-6">
      <PageHeader title="Galeria" description="Treinos livres dos seus personais." />

      <div className="rounded-xl border border-border bg-surface px-4 py-3">
        <p className="text-xs leading-relaxed text-muted">{STUDENT_GALLERY_DISCLAIMER}</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={20} className="animate-spin text-accent" />
            <p className="text-xs text-muted">Carregando galeria...</p>
          </div>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
          <p className="text-xs text-red-500">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <RefreshCw size={12} />
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && activeTrainerCount === 0 && (
        <EmptyState
          icon={Users}
          title="Você ainda não tem um personal vinculado"
          description="Quando um personal conectar você ao espaço dele, os treinos livres publicados aparecem aqui."
        />
      )}

      {!isLoading && !errorMessage && activeTrainerCount > 0 && items.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          title="Nenhum treino livre por aqui ainda"
          description="Seu personal ainda não publicou treinos livres na galeria. Assim que publicar, eles aparecem aqui."
        />
      )}

      {!isLoading && !errorMessage && items.length > 0 && (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.trainerUserId} className="space-y-3">
              <h2 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                <Users size={13} />
                {group.trainerName}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.items.map((item) => (
                  <StudentGalleryCard
                    key={item.templateId}
                    item={item}
                    onView={setSelectedTemplateId}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GalleryPage() {
  const { isTrainer } = useAppShell();

  return isTrainer ? <TrainerGallery /> : <StudentGallery />;
}
