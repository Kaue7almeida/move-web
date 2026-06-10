"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Dumbbell,
  Plus,
  ArrowLeft,
  Pencil,
  RefreshCw,
  FileText,
  Users,
  UserCheck,
  X,
  Loader2,
  ArrowRight,
  Check,
  ChevronRight,
  Calendar,
  Play,
  Trophy,
  Info,
  Sparkles,
  User,
} from "lucide-react";

import type {
  WorkoutTemplateSummary,
  WorkoutTemplateDetail,
  StudentWorkoutSummary,
  StudentWorkoutDetail,
  StudentWorkoutExerciseDetail,
  CreateWorkoutSessionInput,
  WorkoutSessionDetail,
} from "@/bff/modules/workouts/types";
import type {
  TrainerStudentListItem,
} from "@/bff/modules/profile/types";
import {
  UnauthenticatedRequestError,
  authenticatedFetch,
  readApiErrorMessage,
} from "@/services/api/authenticatedFetch";
import { saveChatTriggerIntent } from "@/services/chat/chatTriggerService";

import { useAppShell } from "../AppShellContext";
import {
  PageHeader,
  MetricCard,
  EmptyState,
} from "../app-ui";
import { getRelationshipSummary } from "../app-utils";

import {
  WorkoutStudio,
  type WorkoutStudioCompletedResult,
} from "./_components/WorkoutStudio";
import { ExercisePreviewModal } from "./_components/ExercisePreviewModal";
import { ExerciseThumbnail } from "./_components/ExerciseThumbnail";
import { coverUrlFor, formatEquipment, formatMuscle } from "./_components/studio-types";

/* ─── Types ─── */

type PageMode =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; workout: WorkoutTemplateDetail }
  | {
    kind: "customizedAssign";
    workout: WorkoutTemplateDetail;
    student: Pick<TrainerStudentListItem, "userId" | "fullName">;
  };

type TrainerWorkoutsFeedback = {
  type: "success" | "error";
  message: string;
};

/* ─── Helpers ─── */

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function mapWorkoutDetailToSummary(workout: WorkoutTemplateDetail): WorkoutTemplateSummary {
  return {
    id: workout.id,
    title: workout.title,
    description: workout.description,
    status: workout.status,
    isInGallery: workout.isInGallery,
    galleryCategory: workout.galleryCategory,
    createdAt: workout.createdAt,
    updatedAt: workout.updatedAt,
    exerciseCount: workout.exercises.length,
  };
}

/* ─── Status badge ─── */

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Rascunho",
    className: "bg-surface-strong text-muted",
  },
  active: {
    label: "Ativo",
    className: "bg-success-soft text-success",
  },
  archived: {
    label: "Arquivado",
    className: "bg-surface-strong text-muted",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_LABELS[status] ?? STATUS_LABELS.draft;

  return (
    <span
      className={[
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
        config.className,
      ].join(" ")}
    >
      {config.label}
    </span>
  );
}

/* ─── Workout card ─── */

function WorkoutCard({
  workout,
  onEdit,
  isEditing,
  onAssign,
}: {
  workout: WorkoutTemplateSummary;
  onEdit: (workoutId: string) => void;
  isEditing: boolean;
  onAssign?: (workoutId: string, workoutTitle: string) => void;
}) {
  return (
    <div className="card-themed flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-muted text-accent">
        <Dumbbell size={16} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {workout.title}
          </p>
          <StatusBadge status={workout.status} />
        </div>
        {workout.description && (
          <p className="mt-0.5 truncate text-xs text-muted">
            {workout.description}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[11px] text-muted">
            <span>{workout.exerciseCount} exercício{workout.exerciseCount !== 1 ? "s" : ""}</span>
            <span className="text-border">·</span>
            <span>{formatDate(workout.createdAt)}</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(workout.id)}
              disabled={isEditing}
              className="inline-flex items-center gap-1.5 rounded-md bg-surface-strong px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEditing ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
              {isEditing ? "Abrindo..." : "Editar"}
            </button>

            {workout.status === "active" && onAssign && (
              <button
                type="button"
                onClick={() => onAssign(workout.id, workout.title)}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/20"
              >
                <UserCheck size={12} />
                Aplicar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Workout list ─── */

function WorkoutList({
  workouts,
  isLoading,
  errorMessage,
  onRetry,
  onEdit,
  editingWorkoutId,
  onAssign,
}: {
  workouts: WorkoutTemplateSummary[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onEdit: (workoutId: string) => void;
  editingWorkoutId: string | null;
  onAssign: (workoutId: string, workoutTitle: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-12">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-xs text-muted">Carregando treinos...</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
        <p className="text-xs text-red-500">{errorMessage}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          <RefreshCw size={12} />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Nenhum treino ainda"
        description="Crie seu primeiro treino para começar a montar a rotina dos seus alunos."
      />
    );
  }

  return (
    <div className="space-y-2">
      {workouts.map((workout) => (
        <WorkoutCard
          key={workout.id}
          workout={workout}
          onEdit={onEdit}
          isEditing={editingWorkoutId === workout.id}
          onAssign={onAssign}
        />
      ))}
    </div>
  );
}

/* ─── Assign workout modal ─── */

type AssignModalState =
  | { step: "closed" }
  | { step: "selecting"; workoutId: string; workoutTitle: string }
  | { step: "selectingMultiple"; workoutId: string; workoutTitle: string }
  | { step: "choosingAction"; workoutId: string; workoutTitle: string; student: TrainerStudentListItem }
  | { step: "submitting"; workoutId: string; workoutTitle: string; student: TrainerStudentListItem }
  | { step: "submittingMultiple"; workoutId: string; workoutTitle: string; selectedCount: number }
  | { step: "success"; workoutTitle: string; detailsMessage: string }
  | {
    step: "error";
    flow: "single";
    workoutId: string;
    workoutTitle: string;
    errorMessage: string;
    student: TrainerStudentListItem;
  }
  | {
    step: "error";
    flow: "multiple";
    workoutId: string;
    workoutTitle: string;
    errorMessage: string;
  };

function AssignWorkoutModal({
  state,
  onClose,
  onEnterMultipleSelection,
  onBackToSingleSelection,
  onSendAsIs,
  onSendToMultiple,
  onCustomize,
  onSelectStudent,
  onRetry,
}: {
  state: Exclude<AssignModalState, { step: "closed" }>;
  onClose: () => void;
  onEnterMultipleSelection: () => void;
  onBackToSingleSelection: () => void;
  onSendAsIs: () => void;
  onSendToMultiple: (students: TrainerStudentListItem[]) => void;
  onCustomize: () => void;
  onSelectStudent: (student: TrainerStudentListItem) => void;
  onRetry: () => void;
}) {
  const [students, setStudents] = useState<TrainerStudentListItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const isBusy = state.step === "submitting" || state.step === "submittingMultiple";
  const selectedStudents = students.filter((student) => selectedStudentIds.includes(student.userId));

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      setIsLoadingStudents(true);
      setLoadError(null);

      try {
        const response = await authenticatedFetch("/api/v1/trainer/students", {
          method: "GET",
        });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setLoadError(await readApiErrorMessage(response, "Não foi possível carregar seus alunos."));
          setIsLoadingStudents(false);
          return;
        }

        const payload = (await response.json()) as { students: TrainerStudentListItem[] };

        if (isMounted) {
          setStudents(payload.students.filter((s) => s.status === "active"));
          setIsLoadingStudents(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          if (error instanceof UnauthenticatedRequestError) {
            setLoadError("Sua sessão expirou. Entre novamente.");
          } else {
            setLoadError("Não foi possível carregar seus alunos.");
          }
          setIsLoadingStudents(false);
        }
      }
    }

    void loadStudents();

    return () => {
      isMounted = false;
    };
  }, []);

  function getInitials(name: string) {
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    return (parts[0]?.[0] ?? "?").toUpperCase();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isBusy ? undefined : onClose}
        onKeyDown={() => {}}
        role="presentation"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-surface shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">
              {state.step === "success" ? "Treino aplicado" : "Aplicar treino"}
            </h2>
            {state.step !== "success" && (
              <p className="mt-0.5 truncate text-xs text-muted">
                {state.step === "error" ? state.workoutTitle : state.workoutTitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Success state */}
          {state.step === "success" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
                <Check size={24} className="text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Treino aplicado!</p>
                <p className="mt-1 text-xs text-muted">{state.detailsMessage}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Error state */}
          {state.step === "error" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
                <p className="text-xs text-red-500">{state.errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                <RefreshCw size={12} />
                Tentar novamente
              </button>
            </div>
          )}

          {state.step === "choosingAction" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-muted text-sm font-semibold text-accent">
                {getInitials(state.student.fullName)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{state.student.fullName}</p>
                <p className="text-xs text-muted">{state.student.email}</p>
              </div>
              <p className="text-xs text-muted">
                Escolha como enviar <strong>{state.workoutTitle}</strong> para esse aluno.
              </p>
              <div className="w-full space-y-2">
                <button
                  type="button"
                  onClick={onSendAsIs}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover"
                >
                  <UserCheck size={14} />
                  Enviar como está
                </button>
                <button
                  type="button"
                  onClick={onCustomize}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface-strong py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
                >
                  Personalizar para este aluno
                </button>
              </div>

              <p className="w-full rounded-lg bg-accent/5 px-3 py-2 text-xs leading-relaxed text-muted">
                A personalização cria um treino específico para esse aluno e não altera o modelo original.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="text-xs font-medium text-muted transition-colors hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          )}

          {state.step === "submitting" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-muted text-sm font-semibold text-accent">
                {getInitials(state.student.fullName)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{state.student.fullName}</p>
                <p className="text-xs text-muted">{state.student.email}</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-accent/5 px-4 py-3 text-sm text-foreground">
                <Loader2 size={16} className="animate-spin text-accent" />
                Enviando o treino como está...
              </div>
              <p className="text-xs text-muted">
                O modelo atual será aplicado sem alterar o treino original.
              </p>
            </div>
          )}

          {state.step === "submittingMultiple" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-muted text-sm font-semibold text-accent">
                <Users size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Enviando para vários alunos</p>
                <p className="text-xs text-muted">
                  {state.selectedCount} aluno{state.selectedCount !== 1 ? "s" : ""} selecionado
                  {state.selectedCount !== 1 ? "s" : ""}.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-accent/5 px-4 py-3 text-sm text-foreground">
                <Loader2 size={16} className="animate-spin text-accent" />
                Aplicando o treino em lote...
              </div>
              <p className="text-xs text-muted">
                Nesse modo, o treino é enviado como está para cada aluno selecionado.
              </p>
            </div>
          )}

          {/* Selecting state — student list */}
          {(state.step === "selecting" || state.step === "selectingMultiple") && (
            <>
              {isLoadingStudents && (
                <div className="flex flex-col items-center gap-2 py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <p className="text-xs text-muted">Carregando alunos...</p>
                </div>
              )}

              {!isLoadingStudents && loadError && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <p className="text-xs text-red-500">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      // Trigger a fresh load by remounting — close and reopen
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
                  >
                    <RefreshCw size={12} />
                    Tentar novamente
                  </button>
                </div>
              )}

              {!isLoadingStudents && !loadError && students.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-strong">
                    <Users size={20} className="text-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Nenhum aluno vinculado</p>
                    <p className="mt-1 text-xs text-muted">
                      Adicione alunos na aba Alunos para aplicar treinos.
                    </p>
                  </div>
                  <a
                    href="/app/alunos"
                    className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-on transition-colors hover:bg-accent-hover"
                  >
                    Ir para Alunos
                    <ArrowRight size={12} />
                  </a>
                </div>
              )}

              {!isLoadingStudents && !loadError && students.length > 0 && (
                <div className="space-y-3">
                  {state.step === "selecting" ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-muted">
                        Escolha o aluno ({students.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentIds([]);
                          onEnterMultipleSelection();
                        }}
                        className="text-xs font-semibold text-accent transition-colors hover:text-accent-hover"
                      >
                        Enviar para vários alunos
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium text-muted">
                          Selecione os alunos ({students.length})
                        </p>
                        <button
                          type="button"
                          onClick={onBackToSingleSelection}
                          className="text-xs font-medium text-muted transition-colors hover:text-foreground"
                        >
                          Voltar para envio individual
                        </button>
                      </div>

                      <p className="rounded-lg bg-accent/5 px-3 py-2 text-xs leading-relaxed text-muted">
                        Nesse modo, o treino será enviado como está para cada aluno selecionado.
                      </p>
                    </div>
                  )}

                  {state.step === "selecting" ? (
                    students.map((student) => (
                      <button
                        key={student.userId}
                        type="button"
                        onClick={() => onSelectStudent(student)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-muted text-xs font-semibold text-accent">
                          {getInitials(student.fullName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {student.fullName}
                          </p>
                          <p className="truncate text-[11px] text-muted">{student.email}</p>
                        </div>
                        <ArrowRight size={14} className="shrink-0 text-muted" />
                      </button>
                    ))
                  ) : (
                    <>
                      {students.map((student) => {
                        const isSelected = selectedStudentIds.includes(student.userId);

                        return (
                          <label
                            key={student.userId}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedStudentIds((current) =>
                                  current.includes(student.userId)
                                    ? current.filter((userId) => userId !== student.userId)
                                    : [...current, student.userId],
                                );
                              }}
                              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                            />
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-muted text-xs font-semibold text-accent">
                              {getInitials(student.fullName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {student.fullName}
                              </p>
                              <p className="truncate text-[11px] text-muted">{student.email}</p>
                            </div>
                          </label>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => onSendToMultiple(selectedStudents)}
                        disabled={selectedStudents.length === 0}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Users size={14} />
                        {selectedStudents.length === 0
                          ? "Enviar para vários alunos"
                          : `Enviar para ${selectedStudents.length} aluno${selectedStudents.length !== 1 ? "s" : ""}`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Trainer workouts page ─── */

function TrainerWorkoutsPage() {
  const { me } = useAppShell();
  const stats = getRelationshipSummary(me);
  const [mode, setMode] = useState<PageMode>({ kind: "list" });
  const [workouts, setWorkouts] = useState<WorkoutTemplateSummary[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);
  const [listErrorMessage, setListErrorMessage] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<AssignModalState>({ step: "closed" });
  const [feedbackMessage, setFeedbackMessage] = useState<TrainerWorkoutsFeedback | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);

  async function loadTrainerWorkoutDetail(
    workoutId: string,
    fallbackMessage: string,
  ): Promise<WorkoutTemplateDetail> {
    const response = await authenticatedFetch(`/api/v1/trainer/workouts/${workoutId}`, {
      method: "GET",
    });

    if (response.status === 401) {
      throw new UnauthenticatedRequestError();
    }

    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response, fallbackMessage));
    }

    const payload = (await response.json()) as { workout: WorkoutTemplateDetail };

    return payload.workout;
  }

  async function assignWorkoutAsIs(workoutId: string, studentUserId: string) {
    const response = await authenticatedFetch(`/api/v1/trainer/workouts/${workoutId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentUserId }),
    });

    if (response.status === 401) {
      throw new UnauthenticatedRequestError();
    }

    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response, "Não foi possível aplicar o treino."));
    }

    await response.json() as { studentWorkout: StudentWorkoutSummary };
  }

  useEffect(() => {
    let isMounted = true;

    async function loadWorkouts() {
      try {
        const response = await authenticatedFetch("/api/v1/trainer/workouts", {
          method: "GET",
        });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setListErrorMessage(
            await readApiErrorMessage(response, "Não foi possível carregar seus treinos."),
          );
          setIsLoadingWorkouts(false);
          return;
        }

        const payload = (await response.json()) as { items: WorkoutTemplateSummary[] };

        if (isMounted) {
          setWorkouts(payload.items);
          setIsLoadingWorkouts(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          if (error instanceof UnauthenticatedRequestError) {
            setListErrorMessage("Sua sessão expirou. Entre novamente.");
          } else {
            setListErrorMessage("Não foi possível carregar seus treinos.");
          }
          setIsLoadingWorkouts(false);
        }
      }
    }

    void loadWorkouts();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleRetry() {
    setIsLoadingWorkouts(true);
    setListErrorMessage(null);

    try {
      const response = await authenticatedFetch("/api/v1/trainer/workouts", {
        method: "GET",
      });

      if (response.status === 401) {
        throw new UnauthenticatedRequestError();
      }

      if (!response.ok) {
        setListErrorMessage(
          await readApiErrorMessage(response, "Não foi possível carregar seus treinos."),
        );
        return;
      }

      const payload = (await response.json()) as { items: WorkoutTemplateSummary[] };
      setWorkouts(payload.items);
    } catch (error: unknown) {
      if (error instanceof UnauthenticatedRequestError) {
        setListErrorMessage("Sua sessão expirou. Entre novamente.");
      } else {
        setListErrorMessage("Não foi possível carregar seus treinos.");
      }
    } finally {
      setIsLoadingWorkouts(false);
    }
  }

  function handleWorkoutCreated(workout: WorkoutTemplateDetail) {
    setFeedbackMessage(null);
    setWorkouts((current) => [mapWorkoutDetailToSummary(workout), ...current]);
    setMode({ kind: "list" });
  }

  async function handleWorkoutUpdated() {
    setMode({ kind: "list" });
    setFeedbackMessage({
      type: "success",
      message: "Treino atualizado com sucesso.",
    });
    await handleRetry();
  }

  async function handleOpenEditWorkout(workoutId: string) {
    setEditingWorkoutId(workoutId);
    setFeedbackMessage(null);

    try {
      const workout = await loadTrainerWorkoutDetail(
        workoutId,
        "Não foi possível abrir o treino para edição.",
      );
      setMode({ kind: "edit", workout });
    } catch (error: unknown) {
      setFeedbackMessage({
        type: "error",
        message:
          error instanceof UnauthenticatedRequestError
            ? "Sua sessão expirou. Entre novamente."
            : error instanceof Error
              ? error.message
              : "Não foi possível abrir o treino para edição.",
      });
    } finally {
      setEditingWorkoutId((current) => (current === workoutId ? null : current));
    }
  }

  function handleOpenAssignModal(workoutId: string, workoutTitle: string) {
    setFeedbackMessage(null);
    setAssignModal({ step: "selecting", workoutId, workoutTitle });
  }

  function handleSelectStudent(student: TrainerStudentListItem) {
    if (assignModal.step !== "selecting") return;

    setAssignModal({
      step: "choosingAction",
      workoutId: assignModal.workoutId,
      workoutTitle: assignModal.workoutTitle,
      student,
    });
  }

  function handleEnterMultipleSelection() {
    if (assignModal.step !== "selecting") return;

    setAssignModal({
      step: "selectingMultiple",
      workoutId: assignModal.workoutId,
      workoutTitle: assignModal.workoutTitle,
    });
  }

  function handleBackToSingleSelection() {
    if (assignModal.step !== "selectingMultiple") return;

    setAssignModal({
      step: "selecting",
      workoutId: assignModal.workoutId,
      workoutTitle: assignModal.workoutTitle,
    });
  }

  async function handleSendAssignAsIs() {
    if (assignModal.step !== "choosingAction") return;

    const { workoutId, workoutTitle, student } = assignModal;

    setAssignModal({
      step: "submitting",
      workoutId,
      workoutTitle,
      student,
    });

    try {
      await assignWorkoutAsIs(workoutId, student.userId);

      setAssignModal({
        step: "success",
        workoutTitle,
        detailsMessage: `${workoutTitle} foi aplicado para ${student.fullName}.`,
      });
    } catch (error: unknown) {
      const message = error instanceof UnauthenticatedRequestError
        ? "Sua sessão expirou. Entre novamente."
        : "Não foi possível aplicar o treino.";

      setAssignModal({
        step: "error",
        flow: "single",
        workoutId,
        workoutTitle,
        errorMessage: message,
        student,
      });
    }
  }

  async function handleSendAssignToMultiple(students: TrainerStudentListItem[]) {
    if (assignModal.step !== "selectingMultiple" || students.length === 0) return;

    const { workoutId, workoutTitle } = assignModal;

    setAssignModal({
      step: "submittingMultiple",
      workoutId,
      workoutTitle,
      selectedCount: students.length,
    });

    let completedCount = 0;
    let firstErrorMessage: string | null = null;
    let failedCount = 0;

    try {
      for (const student of students) {
        try {
          await assignWorkoutAsIs(workoutId, student.userId);
          completedCount += 1;
        } catch (error: unknown) {
          if (error instanceof UnauthenticatedRequestError) {
            throw error;
          }

          failedCount += 1;

          if (!firstErrorMessage) {
            firstErrorMessage = error instanceof Error
              ? error.message
              : "Não foi possível aplicar o treino.";
          }
        }
      }

      if (failedCount > 0) {
        const completedLabel = `${completedCount} aluno${completedCount !== 1 ? "s" : ""}`;
        const failedLabel = `${failedCount} aluno${failedCount !== 1 ? "s" : ""}`;

        setAssignModal({
          step: "error",
          flow: "multiple",
          workoutId,
          workoutTitle,
          errorMessage:
            completedCount > 0
              ? `O treino foi enviado para ${completedLabel}, mas falhou para ${failedLabel}. ${firstErrorMessage ?? ""}`.trim()
              : (firstErrorMessage ?? "Não foi possível aplicar o treino."),
        });
        return;
      }

      setAssignModal({
        step: "success",
        workoutTitle,
        detailsMessage: `${workoutTitle} foi aplicado para ${completedCount} aluno${completedCount !== 1 ? "s" : ""}.`,
      });
    } catch (error: unknown) {
      const baseMessage = error instanceof UnauthenticatedRequestError
        ? "Sua sessão expirou. Entre novamente."
        : "Não foi possível aplicar o treino.";

      setAssignModal({
        step: "error",
        flow: "multiple",
        workoutId,
        workoutTitle,
        errorMessage:
          completedCount > 0
            ? `O treino foi enviado para ${completedCount} aluno${completedCount !== 1 ? "s" : ""} antes da interrupção. ${baseMessage}`
            : baseMessage,
      });
    }
  }

  async function handleCustomizeAssign() {
    if (assignModal.step !== "choosingAction") return;

    const { workoutId, student } = assignModal;
    setAssignModal({ step: "closed" });
    setFeedbackMessage(null);

    try {
      const workout = await loadTrainerWorkoutDetail(
        workoutId,
        "Não foi possível abrir a personalização do treino.",
      );

      setMode({
        kind: "customizedAssign",
        workout,
        student: {
          userId: student.userId,
          fullName: student.fullName,
        },
      });
    } catch (error: unknown) {
      setFeedbackMessage({
        type: "error",
        message:
          error instanceof UnauthenticatedRequestError
            ? "Sua sessão expirou. Entre novamente."
            : error instanceof Error
              ? error.message
              : "Não foi possível abrir a personalização do treino.",
      });
    }
  }

  function handleAssignRetry() {
    if (assignModal.step !== "error") return;

    if (assignModal.flow === "single") {
      setAssignModal({
        step: "choosingAction",
        workoutId: assignModal.workoutId,
        workoutTitle: assignModal.workoutTitle,
        student: assignModal.student,
      });
      return;
    }

    setAssignModal({
      step: "selectingMultiple",
      workoutId: assignModal.workoutId,
      workoutTitle: assignModal.workoutTitle,
    });
  }

  function handleCloseAssignModal() {
    setAssignModal({ step: "closed" });
  }

  function handleStudioCompleted(result: WorkoutStudioCompletedResult) {
    if (result.kind === "create") {
      handleWorkoutCreated(result.workout);
      return;
    }

    if (result.kind === "edit") {
      void handleWorkoutUpdated();
      return;
    }

    if (mode.kind === "customizedAssign") {
      setMode({ kind: "list" });
      setFeedbackMessage({
        type: "success",
        message: `Treino personalizado enviado para ${mode.student.fullName}.`,
      });
    }
  }

  if (mode.kind === "create" || mode.kind === "edit" || mode.kind === "customizedAssign") {
    return (
      <WorkoutStudio
        key={
          mode.kind === "create"
            ? "workout-studio-create"
            : mode.kind === "edit"
              ? `workout-studio-edit-${mode.workout.id}`
              : `workout-studio-customized-${mode.workout.id}-${mode.student.userId}`
        }
        mode={
          mode.kind === "create"
            ? { kind: "create" }
            : mode.kind === "edit"
              ? { kind: "edit", workout: mode.workout }
              : {
                kind: "customizedAssign",
                workout: mode.workout,
                student: mode.student,
              }
        }
        onCompleted={handleStudioCompleted}
        onCancel={() => setMode({ kind: "list" })}
      />
    );
  }

  const activeCount = workouts.filter((w) => w.status === "active").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treinos"
        description="Crie, organize e aplique treinos para seus alunos."
        action={
          <button
            type="button"
            onClick={() => {
              setFeedbackMessage(null);
              setMode({ kind: "create" });
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover"
          >
            <Plus size={16} />
            Criar treino
          </button>
        }
      />

      {feedbackMessage && (
        <div
          className={[
            "rounded-xl border px-4 py-3 text-sm",
            feedbackMessage.type === "success"
              ? "border-success/20 bg-success-soft text-success"
              : "border-red-500/20 bg-red-500/5 text-red-500",
          ].join(" ")}
        >
          {feedbackMessage.message}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Total"
          value={isLoadingWorkouts ? "..." : `${workouts.length}`}
          icon={Dumbbell}
        />
        <MetricCard
          label="Ativos"
          value={isLoadingWorkouts ? "..." : `${activeCount}`}
          icon={FileText}
        />
        <MetricCard
          label="Alunos"
          value={`${stats.startedCount}`}
          icon={Users}
        />
      </div>

      {/* List */}
      <WorkoutList
        workouts={workouts}
        isLoading={isLoadingWorkouts}
        errorMessage={listErrorMessage}
        onRetry={() => void handleRetry()}
        onEdit={(workoutId) => void handleOpenEditWorkout(workoutId)}
        editingWorkoutId={editingWorkoutId}
        onAssign={handleOpenAssignModal}
      />

      {/* Assign modal */}
      {assignModal.step !== "closed" && (
        <AssignWorkoutModal
          state={assignModal}
          onClose={handleCloseAssignModal}
          onEnterMultipleSelection={handleEnterMultipleSelection}
          onBackToSingleSelection={handleBackToSingleSelection}
          onSendAsIs={() => void handleSendAssignAsIs()}
          onSendToMultiple={(students) => void handleSendAssignToMultiple(students)}
          onCustomize={() => void handleCustomizeAssign()}
          onSelectStudent={handleSelectStudent}
          onRetry={handleAssignRetry}
        />
      )}
    </div>
  );
}

/* ─── Student workout card ─── */

function StudentStatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
        Ativo
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-surface-strong px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
        Aguardando
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-surface-strong px-2 py-0.5 text-[10px] font-semibold text-muted">
      Encerrado
    </span>
  );
}

/** Most recently activated active workout — the one to feature in the list. */
function pickPrimaryActiveStudentWorkout(
  workouts: StudentWorkoutSummary[],
): StudentWorkoutSummary | null {
  const active = workouts.filter((workout) => workout.status === "active");

  if (active.length === 0) {
    return null;
  }

  return active
    .slice()
    .sort((left, right) =>
      (right.activatedAt ?? right.assignedAt).localeCompare(left.activatedAt ?? left.assignedAt),
    )[0];
}

function StudentWorkoutHighlight({
  workout,
  onView,
}: {
  workout: StudentWorkoutSummary;
  onView: (workoutId: string) => void;
}) {
  return (
    <section className="card-themed rounded-2xl border border-accent/30 bg-surface p-5 ring-1 ring-accent/10">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">Seu treino</p>
        <StudentStatusBadge status={workout.status} />
      </div>

      <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">{workout.title}</h2>
      {workout.description && (
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{workout.description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
          <Dumbbell size={13} className="text-accent" />
          {workout.exerciseCount} exercício{workout.exerciseCount !== 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-background px-3 py-1.5 text-xs text-muted">
          <Calendar size={13} />
          {formatDate(workout.assignedAt)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onView(workout.id)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover active:scale-[0.98]"
      >
        Ver treino
        <ArrowRight size={16} />
      </button>
    </section>
  );
}

function StudentWorkoutCard({
  workout,
  onView,
}: {
  workout: StudentWorkoutSummary;
  onView: (workoutId: string) => void;
}) {
  const isPending = workout.status === "pending";

  return (
    <button
      type="button"
      onClick={() => onView(workout.id)}
      className="card-themed group flex w-full items-center gap-3.5 rounded-xl border border-border bg-surface px-4 py-3.5 text-left transition-all hover:border-accent/30 hover:bg-surface-hover active:scale-[0.99]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
        <Dumbbell size={18} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{workout.title}</p>
          <StudentStatusBadge status={workout.status} />
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
          <span>{workout.exerciseCount} exercício{workout.exerciseCount !== 1 ? "s" : ""}</span>
          <span className="text-border">·</span>
          <span>{formatDate(workout.assignedAt)}</span>
        </div>
        {isPending && (
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Seu personal ainda está preparando — disponível em breve.
          </p>
        )}
      </div>

      <span className="inline-flex shrink-0 items-center gap-1 self-center text-xs font-semibold text-accent">
        Ver treino
        <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

/* ─── Student workout detail view ─── */

function StudentExerciseRow({
  exercise,
  index,
}: {
  exercise: StudentWorkoutExerciseDetail;
  index: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-4">
      {/* Header: number + demonstration + name */}
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
          iconSize={18}
        />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate text-sm font-semibold text-foreground">
            {exercise.exerciseName}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted">
            {formatMuscle(exercise.primaryMuscle)}
            {exercise.equipment ? ` · ${formatEquipment(exercise.equipment)}` : ""}
          </p>
        </div>
      </div>

      {/* Stat pills row */}
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

      {/* Trainer notes */}
      {exercise.notes && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-accent/5 px-3 py-2">
          <FileText size={12} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-xs leading-relaxed text-muted">{exercise.notes}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Visible workout context for the "talk to my personal" message (Task 10f) ───
   Built from data already on screen. No JSON, no Scan, no personal data, no
   session load. Capped to stay within the chat message limit (2000 chars). */
const TRAINER_CHAT_MAX_EXERCISES = 6;
const TRAINER_CHAT_MESSAGE_MAX = 1900;

function buildWorkoutTrainerChatMessage(workout: StudentWorkoutDetail): string {
  const orderedExercises = [...workout.exercises].sort((a, b) => a.sortOrder - b.sortOrder);
  const shown = orderedExercises.slice(0, TRAINER_CHAT_MAX_EXERCISES);
  const remaining = orderedExercises.length - shown.length;

  const exerciseLines = shown.map((exercise) => {
    const reps = exercise.repsText
      ? `${exercise.setsCount} séries de ${exercise.repsText} reps`
      : `${exercise.setsCount} séries`;
    return `- ${exercise.exerciseName} — ${reps}`;
  });

  if (remaining > 0) {
    exerciseLines.push(`- ...e mais ${remaining} exercício${remaining > 1 ? "s" : ""}.`);
  }

  const message = [
    "Tenho uma dúvida sobre este treino.",
    "",
    "Contexto:",
    `Treino: ${workout.title}`,
    "Exercícios:",
    ...exerciseLines,
  ].join("\n");

  if (message.length > TRAINER_CHAT_MESSAGE_MAX) {
    return `${message.slice(0, TRAINER_CHAT_MESSAGE_MAX - 1).trimEnd()}…`;
  }

  return message;
}

/* ─── Contextual chat triggers (Task 10c) — front-only, no sensitive data ─── */
function WorkoutChatTriggers({ workout }: { workout: StudentWorkoutDetail }) {
  const router = useRouter();
  const { me, isTrainer } = useAppShell();

  // Active trainers for this student (exactly one is required to offer the
  // "talk to my personal" shortcut — never guess between multiple).
  const activeTrainerUserIds = Array.from(
    new Set(
      me.relationships
        .filter(
          (relationship) =>
            relationship.student_user_id === me.user.id &&
            relationship.status === "active" &&
            Boolean(relationship.trainer_user_id),
        )
        .map((relationship) => relationship.trainer_user_id),
    ),
  );
  const soleTrainerUserId =
    !isTrainer && activeTrainerUserIds.length === 1 ? activeTrainerUserIds[0] : null;

  const workoutName = workout.title;

  function handleUnderstand() {
    saveChatTriggerIntent({
      id: "workout_understand",
      target: "move_ai",
      visibleMessage: "Me ajude a entender o treino de hoje.",
      title: "Entender treino",
      contextModule: "treinos",
      contextLabel: workoutName || "Treino de hoje",
      sourceRoute: "/app/treinos",
      entityId: workout.id,
      autoSend: true,
      contextTrigger: {
        id: "workout_understand",
        entityId: workout.id,
      },
    });
    router.push("/app/chat");
  }

  function handleTalkToTrainer() {
    if (!soleTrainerUserId) return;
    saveChatTriggerIntent({
      id: "workout_talk_to_trainer",
      target: "trainer_chat",
      visibleMessage: "Tenho uma dúvida sobre este treino.",
      sendMessageOverride: buildWorkoutTrainerChatMessage(workout),
      title: workoutName ? `Dúvida sobre ${workoutName}` : "Dúvida sobre treino",
      contextModule: "treinos",
      contextLabel: workoutName || "Treino de hoje",
      sourceRoute: "/app/treinos",
      entityId: workout.id,
      trainerUserId: soleTrainerUserId,
    });
    router.push("/app/chat");
  }

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <button
        type="button"
        onClick={handleUnderstand}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover sm:w-auto"
      >
        <Sparkles size={15} strokeWidth={1.8} className="text-accent" />
        Entender este treino
      </button>
      {soleTrainerUserId && (
        <button
          type="button"
          onClick={handleTalkToTrainer}
          className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          <User size={13} strokeWidth={1.8} />
          Falar com meu personal
        </button>
      )}
    </div>
  );
}

function StudentWorkoutDetailView({
  workoutId,
  onBack,
  onStartExecution,
}: {
  workoutId: string;
  onBack: () => void;
  onStartExecution: (workout: StudentWorkoutDetail) => void;
}) {
  const [workout, setWorkout] = useState<StudentWorkoutDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      try {
        const response = await authenticatedFetch(
          `/api/v1/student/workouts/${workoutId}`,
          { method: "GET" },
        );

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setErrorMessage(
            await readApiErrorMessage(response, "Não foi possível carregar o treino."),
          );
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as { workout: StudentWorkoutDetail };

        if (isMounted) {
          setWorkout(payload.workout);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          if (error instanceof UnauthenticatedRequestError) {
            setErrorMessage("Sua sessão expirou. Entre novamente.");
          } else {
            setErrorMessage("Não foi possível carregar o treino.");
          }
          setIsLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [workoutId]);

  const totalSets = workout?.exercises.reduce((sum, ex) => sum + ex.setsCount, 0) ?? 0;

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Treinos
      </button>

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-16">
          <div className="flex flex-col items-center gap-2.5">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-xs text-muted">Carregando treino...</p>
          </div>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
          <p className="text-xs text-red-500">{errorMessage}</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <ArrowLeft size={12} />
            Voltar para treinos
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && workout && (
        <>
          {/* Briefing hero */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-lg font-bold text-foreground">{workout.title}</h1>
              <StudentStatusBadge status={workout.status} />
            </div>
            {workout.description && (
              <p className="mt-1 text-sm leading-relaxed text-muted">{workout.description}</p>
            )}

            {/* Stats row */}
            <div className="mt-4 flex flex-wrap gap-2.5">
              <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
                <Dumbbell size={14} className="text-accent" />
                <span className="text-xs font-semibold text-foreground">
                  {workout.exercises.length} exercício{workout.exercises.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
                <FileText size={14} className="text-accent" />
                <span className="text-xs font-semibold text-foreground">
                  {totalSets} série{totalSets !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
                <Calendar size={14} className="text-muted" />
                <span className="text-xs text-muted">{formatDate(workout.assignedAt)}</span>
              </div>
            </div>

            {/* Primary action / status explanation */}
            {workout.status === "active" ? (
              workout.exercises.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onStartExecution(workout)}
                  className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent py-3.5 text-sm font-bold text-accent-on shadow-sm transition-all hover:bg-accent-hover hover:shadow-md active:scale-[0.98]"
                >
                  <Play size={18} />
                  Iniciar treino
                </button>
              ) : (
                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-border bg-background px-4 py-3">
                  <Info size={16} className="mt-0.5 shrink-0 text-muted" />
                  <p className="text-xs leading-relaxed text-muted">
                    Este treino ainda não tem exercícios. Fale com seu personal.
                  </p>
                </div>
              )
            ) : workout.status === "pending" ? (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-border bg-background px-4 py-3">
                <Info size={16} className="mt-0.5 shrink-0 text-muted" />
                <p className="text-xs leading-relaxed text-muted">
                  Este treino ainda não foi liberado pelo seu personal. Assim que ele ativar, o botão para iniciar aparece aqui.
                </p>
              </div>
            ) : (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-border bg-background px-4 py-3">
                <Info size={16} className="mt-0.5 shrink-0 text-muted" />
                <p className="text-xs leading-relaxed text-muted">
                  Este treino foi encerrado pelo seu personal.
                </p>
              </div>
            )}

            <WorkoutChatTriggers workout={workout} />
          </div>

          {/* Exercise list */}
          {workout.exercises.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Exercícios</h2>
              {workout.exercises.map((exercise, index) => (
                <StudentExerciseRow key={exercise.id} exercise={exercise} index={index} />
              ))}
            </div>
          )}

          {/* Bottom CTA — repeated after a long list */}
          {workout.status === "active" && workout.exercises.length > 2 && (
            <button
              type="button"
              onClick={() => onStartExecution(workout)}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent py-3.5 text-sm font-bold text-accent-on shadow-sm transition-all hover:bg-accent-hover hover:shadow-md active:scale-[0.98]"
            >
              <Play size={18} />
              Iniciar treino
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Workout execution types ─── */

type GuidedStepStatus = "pending" | "completed" | "skipped";

type GuidedExecutionStep = {
  key: string;
  studentWorkoutExerciseId: string;
  exerciseId: string | null;
  exerciseName: string;
  description: string | null;
  primaryMuscle: string | null;
  equipment: string | null;
  mediaType: StudentWorkoutExerciseDetail["mediaType"];
  thumbnailUrl: string | null;
  imageStartUrl: string | null;
  imageEndUrl: string | null;
  trainerNotes: string | null;
  targetRepsText: string;
  restSeconds: number | null;
  exerciseIndex: number;
  totalExercises: number;
  setNumber: number;
  totalSetsForExercise: number;
};

type GuidedStepInput = {
  performedReps: string;
  loadKg: string;
  notes: string;
  status: GuidedStepStatus;
};

type RestState = {
  remainingSeconds: number;
  nextStepIndex: number;
};

function buildGuidedExecutionSteps(workout: StudentWorkoutDetail): GuidedExecutionStep[] {
  const totalExercises = workout.exercises.length;

  return workout.exercises.flatMap((exercise, exerciseIndex) => {
    const steps: GuidedExecutionStep[] = [];

    for (let setNumber = 1; setNumber <= exercise.setsCount; setNumber += 1) {
      steps.push({
        key: `${exercise.id}:${setNumber}`,
        studentWorkoutExerciseId: exercise.id,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        description: exercise.description,
        primaryMuscle: exercise.primaryMuscle,
        equipment: exercise.equipment,
        mediaType: exercise.mediaType,
        thumbnailUrl: exercise.thumbnailUrl,
        imageStartUrl: exercise.imageStartUrl,
        imageEndUrl: exercise.imageEndUrl,
        trainerNotes: exercise.notes,
        targetRepsText: exercise.repsText,
        restSeconds: exercise.restSeconds,
        exerciseIndex,
        totalExercises,
        setNumber,
        totalSetsForExercise: exercise.setsCount,
      });
    }

    return steps;
  });
}

/** First integer found in a reps target, as a string. "12" → "12", "8-12" → "8". */
function parseTargetReps(targetRepsText: string): string {
  const match = targetRepsText.match(/\d+/);
  return match ? match[0] : "";
}

/** Resolves performed reps for the payload (backend requires int >= 0).
 *  Never throws: empty/invalid input falls back to the target reps, then 0. */
function resolvePerformedReps(raw: string, targetRepsText: string): number {
  const trimmed = raw.trim();

  if (trimmed !== "") {
    const value = Number(trimmed);
    if (Number.isFinite(value) && value >= 0) {
      return Math.floor(value);
    }
  }

  const fallback = Number(parseTargetReps(targetRepsText));
  return Number.isFinite(fallback) && fallback >= 0 ? Math.floor(fallback) : 0;
}

/** Resolves load for the payload (backend requires >= 0). Empty/invalid → 0. */
function resolveLoadKg(raw: string): number {
  const trimmed = raw.trim();

  if (trimmed === "") {
    return 0;
  }

  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function createGuidedInputs(steps: GuidedExecutionStep[]): GuidedStepInput[] {
  return steps.map((step) => ({
    performedReps: parseTargetReps(step.targetRepsText),
    loadKg: "0",
    notes: "",
    status: "pending",
  }));
}

function getGuidedStats(inputs: GuidedStepInput[]) {
  let completedSets = 0;
  let skippedSets = 0;

  for (const input of inputs) {
    if (input.status === "completed") {
      completedSets += 1;
      continue;
    }

    if (input.status === "skipped") {
      skippedSets += 1;
    }
  }

  return {
    totalSets: inputs.length,
    completedSets,
    skippedSets,
  };
}

function findNextPendingStepIndex(inputs: GuidedStepInput[], startIndex: number): number {
  for (let index = startIndex + 1; index < inputs.length; index += 1) {
    if (inputs[index]?.status === "pending") {
      return index;
    }
  }

  return -1;
}

function hasGuidedProgress(inputs: GuidedStepInput[]) {
  // reps/load now start pre-filled with defaults, so only a completed/skipped
  // set or a typed note counts as real progress worth confirming before exit.
  return inputs.some(
    (input) => input.status !== "pending" || input.notes.trim() !== "",
  );
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/* ─── Workout execution view ─── */

function WorkoutExecutionView({
  workout,
  onBack,
  onCompleted,
}: {
  workout: StudentWorkoutDetail;
  onBack: () => void;
  onCompleted: () => void;
}) {
  const steps = buildGuidedExecutionSteps(workout);
  const [inputs, setInputs] = useState<GuidedStepInput[]>(() => createGuidedInputs(steps));
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [restState, setRestState] = useState<RestState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isExerciseDetailsOpen, setIsExerciseDetailsOpen] = useState(false);
  const [showNotesInput, setShowNotesInput] = useState(false);

  const stats = getGuidedStats(inputs);
  const progressPercent = stats.totalSets > 0
    ? Math.round((stats.completedSets / stats.totalSets) * 100)
    : 0;
  const hasPendingSteps = inputs.some((input) => input.status === "pending");
  const hasProgress = hasGuidedProgress(inputs);
  const currentStep = hasPendingSteps ? (steps[currentStepIndex] ?? null) : null;
  const currentInput = currentStep ? (inputs[currentStepIndex] ?? null) : null;
  const nextPendingStepIndex = currentStep ? findNextPendingStepIndex(inputs, currentStepIndex) : -1;
  const nextPendingStep = nextPendingStepIndex >= 0 ? (steps[nextPendingStepIndex] ?? null) : null;
  const restNextStep = restState ? (steps[restState.nextStepIndex] ?? null) : null;

  useEffect(() => {
    if (!restState || isSubmitting || isSuccess) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRestState((current) => {
        if (!current) {
          return current;
        }

        if (current.remainingSeconds <= 1) {
          setCurrentStepIndex(current.nextStepIndex);
          setShowNotesInput(false);
          setIsExerciseDetailsOpen(false);
          return null;
        }

        return { ...current, remainingSeconds: current.remainingSeconds - 1 };
      });
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [isSubmitting, isSuccess, restState]);

  function updateCurrentInput(field: "performedReps" | "loadKg" | "notes", value: string) {
    if (!currentStep) {
      return;
    }

    setErrorMessage(null);
    setInputs((prev) =>
      prev.map((input, index) =>
        index === currentStepIndex ? { ...input, [field]: value } : input,
      ),
    );
  }

  function goToStep(stepIndex: number) {
    setCurrentStepIndex(stepIndex);
    setRestState(null);
    setShowNotesInput(false);
    setIsExerciseDetailsOpen(false);
  }

  function handleCancel() {
    if (isSubmitting) {
      return;
    }

    if (!hasProgress) {
      onBack();
      return;
    }

    setIsCancelConfirmOpen(true);
  }

  function handleSkipRest() {
    if (!restState) {
      return;
    }

    goToStep(restState.nextStepIndex);
  }

  async function handleSubmit(inputsToPersist: GuidedStepInput[] = inputs) {
    setErrorMessage(null);

    const completedSets: CreateWorkoutSessionInput["sets"] = [];

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      const input = inputsToPersist[index];

      if (!step || !input || input.status !== "completed") {
        continue;
      }

      completedSets.push({
        studentWorkoutExerciseId: step.studentWorkoutExerciseId,
        exerciseName: step.exerciseName,
        setNumber: step.setNumber,
        targetRepsText: step.targetRepsText || undefined,
        performedReps: resolvePerformedReps(input.performedReps, step.targetRepsText),
        loadKg: resolveLoadKg(input.loadKg),
        notes: input.notes.trim() || undefined,
        completed: true,
      });
    }

    if (completedSets.length === 0) {
      setErrorMessage("Conclua pelo menos uma série para registrar o treino.");
      return;
    }

    setIsSubmitting(true);

    try {
      const body: CreateWorkoutSessionInput = { sets: completedSets };
      const response = await authenticatedFetch(
        `/api/v1/student/workouts/${workout.id}/sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (response.status === 401) {
        throw new UnauthenticatedRequestError();
      }

      if (!response.ok) {
        setErrorMessage(
          await readApiErrorMessage(response, "Não foi possível salvar a sessão."),
        );
        return;
      }

      await response.json() as { session: WorkoutSessionDetail };
      setIsSuccess(true);
    } catch (error: unknown) {
      if (error instanceof UnauthenticatedRequestError) {
        setErrorMessage("Sua sessão expirou. Entre novamente.");
      } else {
        setErrorMessage("Não foi possível salvar a sessão.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCompleteCurrentSet() {
    if (!currentStep || !currentInput || isSubmitting) {
      return;
    }

    const nextInputs = inputs.map((input, index) =>
      index === currentStepIndex ? { ...input, status: "completed" as const } : input,
    );
    const nextIndex = findNextPendingStepIndex(nextInputs, currentStepIndex);

    setInputs(nextInputs);
    setErrorMessage(null);
    setShowNotesInput(false);
    setIsExerciseDetailsOpen(false);

    if (nextIndex === -1) {
      void handleSubmit(nextInputs);
      return;
    }

    if (currentStep.restSeconds && currentStep.restSeconds > 0) {
      setRestState({
        remainingSeconds: currentStep.restSeconds,
        nextStepIndex: nextIndex,
      });
      return;
    }

    setCurrentStepIndex(nextIndex);
  }

  function handleSkipCurrentExercise() {
    if (!currentStep || isSubmitting) {
      return;
    }

    let lastSkippedIndex = currentStepIndex;

    const nextInputs = inputs.map((input, index) => {
      const step = steps[index];

      if (
        index < currentStepIndex
        || !step
        || step.studentWorkoutExerciseId !== currentStep.studentWorkoutExerciseId
        || input.status !== "pending"
      ) {
        return input;
      }

      lastSkippedIndex = index;
      return { ...input, status: "skipped" as const };
    });

    const nextIndex = findNextPendingStepIndex(nextInputs, lastSkippedIndex);

    if (nextIndex === -1 && !nextInputs.some((input) => input.status === "completed")) {
      setErrorMessage("Conclua pelo menos uma série antes de encerrar o treino.");
      return;
    }

    setInputs(nextInputs);
    setErrorMessage(null);
    setShowNotesInput(false);
    setIsExerciseDetailsOpen(false);
    setRestState(null);

    if (nextIndex === -1) {
      void handleSubmit(nextInputs);
      return;
    }

    setCurrentStepIndex(nextIndex);
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
        <div className="relative mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-soft">
            <Trophy size={36} className="text-success" />
          </div>
          <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-on shadow-sm">
            <Check size={14} />
          </div>
        </div>

        <h2 className="text-xl font-bold text-foreground">Treino concluído!</h2>
        <p className="mt-2 text-center text-sm text-muted">
          <strong>{workout.title}</strong> registrado com sucesso.
        </p>

        <div className="mt-5 flex gap-3">
          <div className="rounded-lg border border-border bg-surface px-4 py-2.5 text-center">
            <p className="text-lg font-bold text-accent">{stats.completedSets}</p>
            <p className="text-[10px] font-medium text-muted">
              série{stats.completedSets !== 1 ? "s" : ""} concluída{stats.completedSets !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface px-4 py-2.5 text-center">
            <p className="text-lg font-bold text-accent">{steps.length}</p>
            <p className="text-[10px] font-medium text-muted">
              série{steps.length !== 1 ? "s" : ""} planejada{steps.length !== 1 ? "s" : ""}
            </p>
          </div>
          {stats.skippedSets > 0 && (
            <div className="rounded-lg border border-border bg-surface px-4 py-2.5 text-center">
              <p className="text-lg font-bold text-accent">{stats.skippedSets}</p>
              <p className="text-[10px] font-medium text-muted">
                série{stats.skippedSets !== 1 ? "s" : ""} pulada{stats.skippedSets !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onCompleted}
          className="mt-8 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-on transition-all hover:bg-accent-hover active:scale-[0.98]"
        >
          Voltar para treinos
        </button>
      </div>
    );
  }

  return (
    <div className="pb-[calc(11rem+env(safe-area-inset-bottom))] lg:pb-32">
      <div className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 pb-3 pt-1 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-60"
          >
            <X size={16} />
            Cancelar
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-xs font-semibold text-foreground">{workout.title}</p>
            <p className="text-[10px] text-muted">
              {restState
                ? "Descanso"
                : hasPendingSteps
                  ? "Modo guiado"
                  : "Finalizando treino"}
            </p>
          </div>
          <span className="text-xs font-bold text-accent">{progressPercent}%</span>
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-strong">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-muted">
          {stats.completedSets} de {stats.totalSets} séries concluídas
          {stats.skippedSets > 0 ? ` · ${stats.skippedSets} puladas` : ""}
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {restState && restNextStep && (
          <div className="rounded-2xl border border-border bg-surface p-5 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-accent">
              Descanso
            </p>
            <h2 className="mt-2 text-4xl font-bold tracking-tight text-foreground">
              {formatCountdown(restState.remainingSeconds)}
            </h2>
            <p className="mt-2 text-sm text-muted">
              Respire e se prepare para a próxima série.
            </p>

            <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-background text-left">
              <ExerciseThumbnail
                imageUrl={restNextStep.thumbnailUrl ?? restNextStep.imageStartUrl}
                imageEndUrl={restNextStep.imageEndUrl}
                name={restNextStep.exerciseName}
                animate={restNextStep.mediaType === "image_pair"}
                fit="contain"
                className="h-48 w-full"
                iconSize={36}
              />
              <div className="space-y-2 px-4 py-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                  Próximo
                </p>
                <h3 className="text-base font-semibold text-foreground">{restNextStep.exerciseName}</h3>
                <p className="text-sm text-muted">
                  Série {restNextStep.setNumber} de {restNextStep.totalSetsForExercise}
                  {restNextStep.exerciseIndex !== currentStep?.exerciseIndex
                    ? ` · Exercício ${restNextStep.exerciseIndex + 1} de ${restNextStep.totalExercises}`
                    : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-accent/8 px-2.5 py-1 text-[11px] font-semibold text-accent">
                    {restNextStep.targetRepsText} reps esperadas
                  </span>
                  {restNextStep.restSeconds != null && restNextStep.restSeconds > 0 && (
                    <span className="rounded-full bg-surface-strong px-2.5 py-1 text-[11px] font-semibold text-foreground">
                      {restNextStep.restSeconds}s de descanso
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!restState && !hasPendingSteps && (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-accent">
              Finalizando treino
            </p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">{workout.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {isSubmitting
                ? "Salvando suas séries concluídas."
                : errorMessage
                  ? "A sessão não foi salva. Revise a mensagem e tente novamente."
                  : "Tudo pronto para registrar esta sessão."}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-center">
                <p className="text-lg font-bold text-foreground">{stats.completedSets}</p>
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
                  Concluídas
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-center">
                <p className="text-lg font-bold text-foreground">{stats.skippedSets}</p>
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
                  Puladas
                </p>
              </div>
            </div>
          </div>
        )}

        {!restState && hasPendingSteps && currentStep && currentInput && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-accent/8 px-2.5 py-1 text-[11px] font-semibold text-accent">
                  Exercício {currentStep.exerciseIndex + 1} de {currentStep.totalExercises}
                </span>
                <span className="rounded-full bg-surface-strong px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  Série {currentStep.setNumber} de {currentStep.totalSetsForExercise}
                </span>
              </div>

              <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                {currentStep.exerciseName}
              </h2>

              <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-background">
                <ExerciseThumbnail
                  imageUrl={currentStep.thumbnailUrl ?? currentStep.imageStartUrl}
                  imageEndUrl={currentStep.imageEndUrl}
                  name={currentStep.exerciseName}
                  animate={currentStep.mediaType === "image_pair"}
                  fit="contain"
                  className="h-56 w-full sm:h-64"
                  iconSize={44}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-accent/8 px-2.5 py-1 text-[11px] font-semibold text-accent">
                  {currentStep.targetRepsText} reps esperadas
                </span>
                <span className="rounded-full bg-surface-strong px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  {currentStep.restSeconds != null && currentStep.restSeconds > 0
                    ? `${currentStep.restSeconds}s de descanso`
                    : "Sem descanso configurado"}
                </span>
              </div>

              {currentStep.trainerNotes && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-accent/5 px-3 py-2.5">
                  <FileText size={13} className="mt-0.5 shrink-0 text-accent" />
                  <p className="text-xs leading-relaxed text-muted">
                    <span className="font-medium text-accent">Instrução do personal: </span>
                    {currentStep.trainerNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                Registrar série
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground">Reps realizadas</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={currentInput.performedReps}
                    onChange={(event) => updateCurrentInput("performedReps", event.target.value)}
                    className="h-12 w-full rounded-xl border border-border bg-background px-4 text-center text-lg font-semibold text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                    placeholder={currentStep.targetRepsText}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground">Carga (kg)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={currentInput.loadKg}
                    onChange={(event) => updateCurrentInput("loadKg", event.target.value)}
                    className="h-12 w-full rounded-xl border border-border bg-background px-4 text-center text-lg font-semibold text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                    placeholder="0"
                  />
                </label>
              </div>

              <p className="mt-2 text-xs text-muted">
                Já preenchemos com base no treino — ajuste só se quiser.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsExerciseDetailsOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-strong px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
                >
                  <FileText size={14} />
                  Ver detalhes do exercício
                </button>
                <button
                  type="button"
                  onClick={() => setShowNotesInput((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-strong px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
                >
                  <FileText size={14} />
                  {showNotesInput ? "Ocultar observação" : "Adicionar observação"}
                </button>
              </div>

              {showNotesInput && (
                <div className="mt-4 space-y-1.5">
                  <span className="text-xs font-medium text-foreground">Observação da série</span>
                  <textarea
                    value={currentInput.notes}
                    onChange={(event) => updateCurrentInput("notes", event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                    placeholder="Ex.: última série falhou nas duas últimas reps"
                  />
                </div>
              )}

              {nextPendingStep && (
                <div className="mt-4 rounded-xl border border-border bg-background px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                    Depois desta série
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {nextPendingStep.exerciseName}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Série {nextPendingStep.setNumber} de {nextPendingStep.totalSetsForExercise}
                    {nextPendingStep.exerciseIndex !== currentStep.exerciseIndex
                      ? ` · Exercício ${nextPendingStep.exerciseIndex + 1} de ${nextPendingStep.totalExercises}`
                      : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-500">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:left-[240px] lg:bottom-0 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 lg:flex-row lg:items-center">
          {restState ? (
            <>
              <p className="text-xs text-muted lg:flex-1">
                Próxima série em {formatCountdown(restState.remainingSeconds)}.
              </p>
              <button
                type="button"
                onClick={handleSkipRest}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-bold text-accent-on transition-all hover:bg-accent-hover active:scale-[0.98] lg:w-auto lg:min-w-[14rem]"
              >
                <ArrowRight size={16} />
                Pular descanso
              </button>
            </>
          ) : !hasPendingSteps ? (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-bold text-accent-on transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando treino...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Tentar salvar treino
                </>
              )}
            </button>
          ) : currentStep && currentInput ? (
            <>
              <button
                type="button"
                onClick={handleSkipCurrentExercise}
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto lg:min-w-[14rem]"
              >
                <ArrowRight size={16} />
                Pular exercício
              </button>
              <button
                type="button"
                onClick={handleCompleteCurrentSet}
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-bold text-accent-on transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] lg:flex-1"
              >
                <Check size={16} />
                {nextPendingStep ? "Concluir série" : "Finalizar treino"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsCancelConfirmOpen(false)}
            onKeyDown={() => {}}
            role="presentation"
          />

          <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-border bg-surface p-5 shadow-2xl sm:rounded-2xl">
            <p className="text-sm font-semibold text-foreground">Cancelar treino?</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Você já registrou progresso neste treino. Se sair agora, os dados não salvos serão perdidos.
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(false)}
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-surface-strong px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                Continuar treinando
              </button>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover"
              >
                Sair do treino
              </button>
            </div>
          </div>
        </div>
      )}

      {isExerciseDetailsOpen && currentStep && (
        <ExercisePreviewModal
          exercise={{
            name: currentStep.exerciseName,
            primaryMuscle: currentStep.primaryMuscle,
            equipment: currentStep.equipment,
            description: currentStep.description,
            mediaType: currentStep.mediaType,
            imageStartUrl: currentStep.imageStartUrl ?? currentStep.thumbnailUrl,
            imageEndUrl: currentStep.imageEndUrl,
          }}
          onClose={() => setIsExerciseDetailsOpen(false)}
        />
      )}
    </div>
  );
}

/* ─── Student workouts page ─── */

type StudentPageMode = "list" | "detail" | "executing";

function StudentWorkoutsPage() {
  const { me } = useAppShell();
  const stats = getRelationshipSummary(me);
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoStartWorkoutId = searchParams.get("iniciar");
  const autoStartConsumedRef = useRef(false);
  const [mode, setMode] = useState<StudentPageMode>("list");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [executingWorkout, setExecutingWorkout] = useState<StudentWorkoutDetail | null>(null);
  const [workouts, setWorkouts] = useState<StudentWorkoutSummary[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);
  const [listErrorMessage, setListErrorMessage] = useState<string | null>(null);

  // Auto-start handoff from the gallery: when redirected with `?iniciar=<id>`,
  // open the freshly created student_workout straight into guided execution,
  // reusing the existing engine. Consumed once, then the param is cleared.
  useEffect(() => {
    if (!autoStartWorkoutId || autoStartConsumedRef.current) {
      return;
    }

    autoStartConsumedRef.current = true;
    let isMounted = true;

    async function openGalleryExecution(workoutId: string) {
      try {
        const response = await authenticatedFetch(`/api/v1/student/workouts/${workoutId}`, {
          method: "GET",
        });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setListErrorMessage(
            await readApiErrorMessage(response, "Não foi possível abrir o treino iniciado."),
          );
          return;
        }

        const payload = (await response.json()) as { workout: StudentWorkoutDetail };

        if (isMounted) {
          setExecutingWorkout(payload.workout);
          setMode("executing");
        }
      } catch (error: unknown) {
        if (isMounted) {
          setListErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível abrir o treino iniciado.",
          );
        }
      } finally {
        router.replace("/app/treinos");
      }
    }

    void openGalleryExecution(autoStartWorkoutId);

    return () => {
      isMounted = false;
    };
  }, [autoStartWorkoutId, router]);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkouts() {
      try {
        const response = await authenticatedFetch("/api/v1/student/workouts", {
          method: "GET",
        });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setListErrorMessage(
            await readApiErrorMessage(response, "Não foi possível carregar seus treinos."),
          );
          setIsLoadingWorkouts(false);
          return;
        }

        const payload = (await response.json()) as { items: StudentWorkoutSummary[] };

        if (isMounted) {
          setWorkouts(payload.items);
          setIsLoadingWorkouts(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          if (error instanceof UnauthenticatedRequestError) {
            setListErrorMessage("Sua sessão expirou. Entre novamente.");
          } else {
            setListErrorMessage("Não foi possível carregar seus treinos.");
          }
          setIsLoadingWorkouts(false);
        }
      }
    }

    void loadWorkouts();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleRetry() {
    setIsLoadingWorkouts(true);
    setListErrorMessage(null);

    try {
      const response = await authenticatedFetch("/api/v1/student/workouts", {
        method: "GET",
      });

      if (response.status === 401) {
        throw new UnauthenticatedRequestError();
      }

      if (!response.ok) {
        setListErrorMessage(
          await readApiErrorMessage(response, "Não foi possível carregar seus treinos."),
        );
        return;
      }

      const payload = (await response.json()) as { items: StudentWorkoutSummary[] };
      setWorkouts(payload.items);
    } catch (error: unknown) {
      if (error instanceof UnauthenticatedRequestError) {
        setListErrorMessage("Sua sessão expirou. Entre novamente.");
      } else {
        setListErrorMessage("Não foi possível carregar seus treinos.");
      }
    } finally {
      setIsLoadingWorkouts(false);
    }
  }

  function handleViewWorkout(workoutId: string) {
    setSelectedWorkoutId(workoutId);
    setMode("detail");
  }

  function handleBackToList() {
    setMode("list");
    setSelectedWorkoutId(null);
    setExecutingWorkout(null);
  }

  function handleStartExecution(workout: StudentWorkoutDetail) {
    setExecutingWorkout(workout);
    setMode("executing");
  }

  function handleExecutionCompleted() {
    setExecutingWorkout(null);
    setSelectedWorkoutId(null);
    setMode("list");
  }

  function handleBackFromExecution() {
    setMode("detail");
    setExecutingWorkout(null);
  }

  if (mode === "executing" && executingWorkout) {
    return (
      <WorkoutExecutionView
        key={executingWorkout.id}
        workout={executingWorkout}
        onBack={handleBackFromExecution}
        onCompleted={handleExecutionCompleted}
      />
    );
  }

  if (mode === "detail" && selectedWorkoutId) {
    return (
      <StudentWorkoutDetailView
        workoutId={selectedWorkoutId}
        onBack={handleBackToList}
        onStartExecution={handleStartExecution}
      />
    );
  }

  const primaryWorkout = pickPrimaryActiveStudentWorkout(workouts);
  const restWorkouts = primaryWorkout
    ? workouts.filter((workout) => workout.id !== primaryWorkout.id)
    : workouts;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treinos"
        description="Seus treinos aplicados pelo seu personal."
      />

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Personal"
          value={stats.activeCount > 0 ? `${stats.activeCount}` : "Aguardando"}
          icon={Users}
        />
        <MetricCard
          label="Treinos"
          value={isLoadingWorkouts ? "..." : `${workouts.length}`}
          icon={Dumbbell}
        />
      </div>

      {/* Loading */}
      {isLoadingWorkouts && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-12">
          <div className="flex flex-col items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-xs text-muted">Carregando treinos...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {!isLoadingWorkouts && listErrorMessage && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
          <p className="text-xs text-red-500">{listErrorMessage}</p>
          <button
            type="button"
            onClick={() => void handleRetry()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <RefreshCw size={12} />
            Tentar novamente
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoadingWorkouts && !listErrorMessage && workouts.length === 0 && (
        <EmptyState
          icon={Dumbbell}
          title="Você ainda não tem treinos disponíveis"
          description="Quando seu personal criar e aplicar um treino para você, ele aparece automaticamente aqui."
        />
      )}

      {/* List */}
      {!isLoadingWorkouts && !listErrorMessage && workouts.length > 0 && (
        <div className="space-y-5">
          {primaryWorkout && (
            <StudentWorkoutHighlight workout={primaryWorkout} onView={handleViewWorkout} />
          )}

          {restWorkouts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
                {primaryWorkout ? "Outros treinos" : "Seus treinos"}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {restWorkouts.map((workout) => (
                  <StudentWorkoutCard
                    key={workout.id}
                    workout={workout}
                    onView={handleViewWorkout}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─── */

export default function WorkoutsPage() {
  const { isTrainer } = useAppShell();

  return isTrainer ? <TrainerWorkoutsPage /> : <StudentWorkoutsPage />;
}
