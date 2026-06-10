"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Layers,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";

import type {
  StudentSessionDetail,
  StudentSessionSummary,
  TrainerStudentActivity,
} from "@/bff/modules/workouts/types";
import {
  UnauthenticatedRequestError,
  authenticatedFetch,
  readApiErrorMessage,
} from "@/services/api/authenticatedFetch";

import { useAppShell } from "../AppShellContext";
import { PageHeader, MetricCard, EmptyState, RoleGuard } from "../app-ui";

function formatSessionDate(iso: string | null): string {
  if (!iso) {
    return "Data indisponível";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponível";
  }

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) {
    return null;
  }

  const totalMinutes = Math.round(seconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}

function initialOf(name: string): string {
  return (name.trim()[0] ?? "A").toUpperCase();
}

/* ─── Student activity card ─── */

function StudentActivityCard({
  student,
  onView,
}: {
  student: TrainerStudentActivity;
  onView: (student: { userId: string; fullName: string }) => void;
}) {
  const hasTrained = student.completedSessionCount > 0;

  return (
    <button
      type="button"
      onClick={() => onView({ userId: student.studentUserId, fullName: student.fullName })}
      className="card-themed group flex w-full items-center gap-3.5 rounded-xl border border-border bg-surface px-4 py-3.5 text-left transition-all hover:border-accent/30 hover:bg-surface-hover active:scale-[0.99]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-strong text-sm font-semibold text-muted-foreground">
        {initialOf(student.fullName)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{student.fullName}</p>
        {hasTrained && student.lastSession ? (
          <p className="mt-0.5 truncate text-[11px] text-muted">
            Último: {student.lastSession.workoutTitle ?? "Treino"} · {formatSessionDate(student.lastSession.completedAt)}
          </p>
        ) : (
          <p className="mt-0.5 truncate text-[11px] text-muted">Ainda não registrou treino</p>
        )}
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
          <span>{student.completedSessionCount} concluído{student.completedSessionCount !== 1 ? "s" : ""}</span>
          {student.sessionsLast7Days > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="font-medium text-success">{student.sessionsLast7Days} nos últimos 7 dias</span>
            </>
          )}
        </div>
      </div>

      <span className="inline-flex shrink-0 items-center gap-1 self-center text-xs font-semibold text-accent">
        Ver atividade
        <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

/* ─── Session summary card (within a student) ─── */

function TrainerSessionCard({
  session,
  onView,
}: {
  session: StudentSessionSummary;
  onView: (sessionId: string) => void;
}) {
  const duration = formatDuration(session.durationSeconds);

  return (
    <button
      type="button"
      onClick={() => onView(session.id)}
      className="card-themed group flex w-full items-center gap-3.5 rounded-xl border border-border bg-surface px-4 py-3.5 text-left transition-all hover:border-accent/30 hover:bg-surface-hover active:scale-[0.99]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
        <CheckCircle2 size={18} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{session.workoutTitle ?? "Treino"}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
          <span>{formatSessionDate(session.completedAt ?? session.startedAt)}</span>
          <span className="text-border">·</span>
          <span>{session.exerciseCount} exercício{session.exerciseCount !== 1 ? "s" : ""}</span>
          <span className="text-border">·</span>
          <span>{session.setCount} série{session.setCount !== 1 ? "s" : ""}</span>
          {duration && (
            <>
              <span className="text-border">·</span>
              <span>{duration}</span>
            </>
          )}
        </div>
      </div>

      <span className="inline-flex shrink-0 items-center gap-1 self-center text-xs font-semibold text-accent">
        Ver detalhes
        <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

/* ─── Session detail ─── */

function TrainerSessionDetail({
  studentUserId,
  studentName,
  sessionId,
  onBack,
}: {
  studentUserId: string;
  studentName: string;
  sessionId: string;
  onBack: () => void;
}) {
  const [session, setSession] = useState<StudentSessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      try {
        const response = await authenticatedFetch(
          `/api/v1/trainer/students/${studentUserId}/workout-sessions/${sessionId}`,
          { method: "GET" },
        );

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setErrorMessage(await readApiErrorMessage(response, "Não foi possível carregar a sessão."));
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as { session: StudentSessionDetail };

        if (isMounted) {
          setSession(payload.session);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível carregar a sessão.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [studentUserId, sessionId]);

  const totalSets = session?.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0) ?? 0;
  const duration = session ? formatDuration(session.durationSeconds) : null;

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        {studentName}
      </button>

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-16">
          <Loader2 size={22} className="animate-spin text-accent" />
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
            Voltar
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && session && (
        <>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-success">
              <CheckCircle2 size={14} />
              Treino concluído
            </div>
            <h1 className="mt-2 text-lg font-bold text-foreground">{session.workoutTitle ?? "Treino"}</h1>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
                <Calendar size={14} className="text-muted" />
                <span className="text-xs text-foreground">{formatSessionDate(session.completedAt ?? session.startedAt)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
                <Dumbbell size={14} className="text-accent" />
                <span className="text-xs font-semibold text-foreground">
                  {session.exercises.length} exercício{session.exercises.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
                <Layers size={14} className="text-accent" />
                <span className="text-xs font-semibold text-foreground">
                  {totalSets} série{totalSets !== 1 ? "s" : ""}
                </span>
              </div>
              {duration && (
                <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
                  <Clock size={14} className="text-muted" />
                  <span className="text-xs text-foreground">{duration}</span>
                </div>
              )}
            </div>

            {session.notes && (
              <p className="mt-4 rounded-xl bg-background px-4 py-3 text-xs leading-relaxed text-muted">
                {session.notes}
              </p>
            )}
          </div>

          {session.exercises.length > 0 ? (
            <div className="space-y-3">
              {session.exercises.map((exercise, index) => (
                <div
                  key={`${exercise.exerciseName}-${index}`}
                  className="rounded-xl border border-border bg-surface/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-on">
                      {index + 1}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                      {exercise.exerciseName}
                    </p>
                    <span className="shrink-0 text-[11px] text-muted">
                      {exercise.sets.length} série{exercise.sets.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {exercise.sets.map((set) => (
                      <div
                        key={set.setNumber}
                        className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-strong text-[10px] font-bold text-muted-foreground">
                            {set.setNumber}
                          </span>
                          <span className="text-sm font-semibold text-foreground">{set.performedReps} reps</span>
                          <span className="text-border">·</span>
                          <span className="text-sm text-muted-foreground">{set.loadKg} kg</span>
                          {set.targetRepsText && (
                            <span className="truncate text-[11px] text-muted">alvo {set.targetRepsText}</span>
                          )}
                        </div>
                        {set.completed ? (
                          <Check size={15} className="shrink-0 text-success" strokeWidth={2.5} />
                        ) : (
                          <span className="shrink-0 text-[11px] text-muted">não feita</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-surface/50 px-4 py-8 text-center text-xs text-muted">
              Nenhuma série registrada nesta sessão.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Student sessions list ─── */

function TrainerStudentSessions({
  student,
  onBack,
  onViewSession,
}: {
  student: { userId: string; fullName: string };
  onBack: () => void;
  onViewSession: (sessionId: string) => void;
}) {
  const [sessions, setSessions] = useState<StudentSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      try {
        const response = await authenticatedFetch(
          `/api/v1/trainer/students/${student.userId}/workout-sessions`,
          { method: "GET" },
        );

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setErrorMessage(await readApiErrorMessage(response, "Não foi possível carregar as sessões do aluno."));
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as { sessions: StudentSessionSummary[] };

        if (isMounted) {
          setSessions(payload.sessions);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível carregar as sessões do aluno.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadSessions();

    return () => {
      isMounted = false;
    };
  }, [student.userId]);

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Acompanhamento
      </button>

      <div>
        <h1 className="text-lg font-bold text-foreground">{student.fullName}</h1>
        <p className="mt-0.5 text-sm text-muted">Treinos concluídos por este aluno.</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-12">
          <Loader2 size={20} className="animate-spin text-accent" />
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
            <ArrowLeft size={12} />
            Voltar
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && sessions.length === 0 && (
        <EmptyState
          icon={Dumbbell}
          title="Este aluno ainda não concluiu treinos"
          description="Quando ele concluir um treino que você aplicou, a sessão aparece aqui com séries, reps e cargas."
        />
      )}

      {!isLoading && !errorMessage && sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.map((session) => (
            <TrainerSessionCard key={session.id} session={session} onView={onViewSession} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Follow-up (activity list + navigation) ─── */

function TrainerFollowUp() {
  const [students, setStudents] = useState<TrainerStudentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<{ userId: string; fullName: string } | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadActivity() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await authenticatedFetch("/api/v1/trainer/students/activity", { method: "GET" });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setErrorMessage(await readApiErrorMessage(response, "Não foi possível carregar o acompanhamento."));
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as { students: TrainerStudentActivity[] };

        if (isMounted) {
          setStudents(payload.students);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível carregar o acompanhamento.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadActivity();

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  if (selectedStudent && selectedSessionId) {
    return (
      <TrainerSessionDetail
        studentUserId={selectedStudent.userId}
        studentName={selectedStudent.fullName}
        sessionId={selectedSessionId}
        onBack={() => setSelectedSessionId(null)}
      />
    );
  }

  if (selectedStudent) {
    return (
      <TrainerStudentSessions
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
        onViewSession={setSelectedSessionId}
      />
    );
  }

  const totalStudents = students.length;
  const trainedLast7 = students.filter((student) => student.sessionsLast7Days > 0).length;
  const withoutRecord = students.filter((student) => student.completedSessionCount === 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Acompanhamento"
        description="Veja quem treinou, quando, e o que cada aluno registrou."
      />

      {!isLoading && !errorMessage && totalStudents > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <MetricCard label="Alunos" value={`${totalStudents}`} icon={Users} />
          <MetricCard label="Últimos 7 dias" value={`${trainedLast7}`} detail="treinaram" icon={Activity} />
          <MetricCard label="Sem registro" value={`${withoutRecord}`} icon={Dumbbell} />
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={20} className="animate-spin text-accent" />
            <p className="text-xs text-muted">Carregando acompanhamento...</p>
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

      {!isLoading && !errorMessage && totalStudents === 0 && (
        <EmptyState
          icon={Users}
          title="Você ainda não tem alunos ativos"
          description="Vincule um aluno na área de Alunos para começar a acompanhar os treinos dele aqui."
          action={{ label: "Ir para Alunos", href: "/app/alunos" }}
        />
      )}

      {!isLoading && !errorMessage && totalStudents > 0 && (
        <div className="space-y-2">
          {students.map((student) => (
            <StudentActivityCard
              key={student.studentUserId}
              student={student}
              onView={setSelectedStudent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FollowUpPage() {
  const { isTrainer } = useAppShell();

  if (!isTrainer) {
    return (
      <RoleGuard
        title="Acompanhamento"
        description="O acompanhamento faz parte do espaço do personal no Move."
      />
    );
  }

  return <TrainerFollowUp />;
}
