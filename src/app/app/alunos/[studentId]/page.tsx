"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  UserCheck,
} from "lucide-react";

import type {
  StudentSessionSummary,
  StudentWorkoutSummary,
  TrainerStudentWorkoutsResponse,
} from "@/bff/modules/workouts/types";
import {
  UnauthenticatedRequestError,
  authenticatedFetch,
  readApiErrorMessage,
} from "@/services/api/authenticatedFetch";

import { useAppShell } from "../../AppShellContext";
import { MetricCard, RoleGuard } from "../../app-ui";
import {
  WorkoutStudio,
  type WorkoutStudioCompletedResult,
} from "../../treinos/_components/WorkoutStudio";

type StudentInfo = TrainerStudentWorkoutsResponse["student"];

type Feedback = {
  type: "success" | "error";
  message: string;
};

function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return (parts[0]?.[0] ?? "?").toUpperCase();
}

/* ─── Workout status badge ─── */
function WorkoutStatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
        Ativo
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-surface-strong px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
        Aguardando
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-surface-strong px-2 py-0.5 text-[11px] font-semibold text-muted">
      Encerrado
    </span>
  );
}

/* ─── Assigned workout card (read-only) ─── */
function StudentWorkoutCard({ workout }: { workout: StudentWorkoutSummary }) {
  return (
    <div className="card-themed flex items-center gap-3.5 rounded-xl border border-border bg-surface px-4 py-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Dumbbell size={18} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{workout.title}</p>
          <WorkoutStatusBadge status={workout.status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          <span>
            {workout.exerciseCount} exercício{workout.exerciseCount !== 1 ? "s" : ""}
          </span>
          <span className="text-border">·</span>
          <span>Aplicado em {formatDate(workout.assignedAt)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Student detail content ─── */
function StudentDetail({ studentId }: { studentId: string }) {
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [workouts, setWorkouts] = useState<StudentWorkoutSummary[]>([]);
  const [sessions, setSessions] = useState<StudentSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [view, setView] = useState<"overview" | "create">("overview");
  const [isAssigning, setIsAssigning] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  function reload() {
    setReloadToken((token) => token + 1);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [workoutsResponse, sessionsResponse] = await Promise.all([
          authenticatedFetch(`/api/v1/trainer/students/${studentId}/workouts`, { method: "GET" }),
          authenticatedFetch(`/api/v1/trainer/students/${studentId}/workout-sessions`, {
            method: "GET",
          }),
        ]);

        if (!isMounted) return;

        if (workoutsResponse.status === 401 || sessionsResponse.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!workoutsResponse.ok) {
          setErrorMessage(
            await readApiErrorMessage(workoutsResponse, "Não foi possível carregar este aluno."),
          );
          setIsLoading(false);
          return;
        }

        const workoutsPayload = (await workoutsResponse.json()) as TrainerStudentWorkoutsResponse;

        if (!isMounted) return;

        setStudent(workoutsPayload.student);
        setWorkouts(workoutsPayload.workouts);

        // Sessions are supporting context — a failure here shouldn't block the page.
        if (sessionsResponse.ok) {
          const sessionsPayload = (await sessionsResponse.json()) as {
            sessions: StudentSessionSummary[];
          };

          if (isMounted) {
            setSessions(sessionsPayload.sessions);
          }
        } else if (isMounted) {
          setSessions([]);
        }

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível carregar este aluno.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [studentId, reloadToken]);

  async function handleStudioCompleted(result: WorkoutStudioCompletedResult) {
    if (result.kind !== "create") {
      setView("overview");
      return;
    }

    setView("overview");
    setIsAssigning(true);
    setFeedback(null);

    try {
      const response = await authenticatedFetch(
        `/api/v1/trainer/workouts/${result.workout.id}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentUserId: studentId }),
        },
      );

      if (response.status === 401) {
        throw new UnauthenticatedRequestError();
      }

      if (!response.ok) {
        setFeedback({
          type: "error",
          message: await readApiErrorMessage(
            response,
            `"${result.workout.title}" foi criado, mas não foi aplicado. Use a aba Treinos para aplicá-lo.`,
          ),
        });
        return;
      }

      await response.json();
      setFeedback({
        type: "success",
        message: `"${result.workout.title}" foi criado e aplicado para ${student?.fullName ?? "o aluno"}.`,
      });
      reload();
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        message:
          error instanceof UnauthenticatedRequestError
            ? "Sua sessão expirou. Entre novamente."
            : `"${result.workout.title}" foi criado, mas não foi aplicado. Use a aba Treinos para aplicá-lo.`,
      });
    } finally {
      setIsAssigning(false);
    }
  }

  if (view === "create" && student) {
    return (
      <div className="space-y-4">
        <div className="card-themed rounded-xl border border-accent/20 bg-accent/5 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-accent">
            Novo treino para aluno
          </p>
          <h2 className="mt-1 text-base font-semibold text-foreground">
            Criando treino para {student.fullName}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Ao salvar, o treino será criado e aplicado automaticamente para este aluno.
          </p>
        </div>

        <WorkoutStudio
          mode={{ kind: "create" }}
          onCompleted={(result) => void handleStudioCompleted(result)}
          onCancel={() => setView("overview")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/app/alunos"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Alunos
      </Link>

      {isAssigning && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-foreground">
          <Loader2 size={16} className="animate-spin text-accent" />
          Aplicando treino para o aluno...
        </div>
      )}

      {feedback && (
        <div
          className={[
            "rounded-xl border px-4 py-3 text-sm",
            feedback.type === "success"
              ? "border-success/20 bg-success-soft text-success"
              : "border-red-500/20 bg-red-500/5 text-red-500",
          ].join(" ")}
        >
          {feedback.message}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-16">
          <div className="flex flex-col items-center gap-2.5">
            <Loader2 size={22} className="animate-spin text-accent" />
            <p className="text-sm text-muted">Carregando aluno...</p>
          </div>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
          <p className="text-sm text-red-500">{errorMessage}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <RefreshCw size={14} />
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && student && (
        <>
          {/* Header */}
          <div className="card-themed rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-muted text-lg font-semibold text-accent">
                {getInitials(student.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
                  {student.fullName}
                </h1>
                {student.email && (
                  <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted">
                    <Mail size={14} className="shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </p>
                )}
                <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-success-soft px-2 py-1 text-[11px] font-medium text-success">
                  <UserCheck size={11} /> Vínculo ativo
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setView("create");
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover active:scale-[0.98]"
            >
              <Plus size={18} />
              Criar treino para este aluno
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Treinos ativos" value={`${workouts.length}`} icon={Dumbbell} />
            <MetricCard
              label="Sessões"
              value={`${sessions.length}`}
              detail="concluídas"
              icon={CheckCircle2}
            />
            <MetricCard
              label="Última sessão"
              value={sessions.length > 0 ? formatDate(sessions[0].completedAt ?? sessions[0].startedAt) : "—"}
              icon={Calendar}
            />
          </div>

          {/* Workouts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Treinos do aluno ({workouts.length})
              </h2>
              <Link
                href="/app/acompanhamento"
                className="inline-flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent-hover"
              >
                Ver atividade
                <ChevronRight size={13} />
              </Link>
            </div>

            {workouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-10 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-muted">
                  <Dumbbell size={22} className="text-accent" strokeWidth={1.5} />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">
                  Nenhum treino atribuído
                </h3>
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
                  Crie o primeiro treino para este aluno. Ele aparece aqui e fica disponível na área
                  de treinos do aluno.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    setView("create");
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover"
                >
                  <Plus size={15} />
                  Criar treino
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {workouts.map((workout) => (
                  <StudentWorkoutCard key={workout.id} workout={workout} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Page ─── */
export default function StudentDetailPage() {
  const { isTrainer } = useAppShell();
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;

  if (!isTrainer) {
    return (
      <RoleGuard
        title="Aluno"
        description="A visão do aluno faz parte do espaço do personal no Move."
      />
    );
  }

  return <StudentDetail studentId={studentId} />;
}
