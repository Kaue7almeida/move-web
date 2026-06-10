"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Layers,
  Loader2,
  RefreshCw,
} from "lucide-react";

import type {
  StudentSessionDetail,
  StudentSessionSummary,
} from "@/bff/modules/workouts/types";
import {
  UnauthenticatedRequestError,
  authenticatedFetch,
  readApiErrorMessage,
} from "@/services/api/authenticatedFetch";

import { useAppShell } from "../AppShellContext";
import { PageHeader, MetricCard, EmptyState, RoleGuard } from "../app-ui";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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

function formatShortDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
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

/* ─── Session card (list) ─── */

function HistorySessionCard({
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
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {session.workoutTitle ?? "Treino"}
          </p>
          {session.source === "gallery" && (
            <span className="inline-flex shrink-0 items-center rounded-full bg-accent/8 px-2 py-0.5 text-[10px] font-semibold text-accent">
              Galeria
            </span>
          )}
        </div>
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

function HistorySessionDetail({
  sessionId,
  onBack,
}: {
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
          `/api/v1/student/workout-sessions/${sessionId}`,
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
  }, [sessionId]);

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
        Histórico
      </button>

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-16">
          <div className="flex flex-col items-center gap-2.5">
            <Loader2 size={22} className="animate-spin text-accent" />
            <p className="text-xs text-muted">Carregando sessão...</p>
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
            Voltar para o histórico
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && session && (
        <>
          {/* Header */}
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

          {/* Exercises */}
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
                          <span className="text-sm font-semibold text-foreground">
                            {set.performedReps} reps
                          </span>
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

/* ─── Student history (list + detail) ─── */

function StudentHistory() {
  const [sessions, setSessions] = useState<StudentSessionSummary[]>([]);
  const [last7Days, setLast7Days] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await authenticatedFetch("/api/v1/student/workout-sessions", { method: "GET" });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setErrorMessage(await readApiErrorMessage(response, "Não foi possível carregar seu histórico."));
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as { sessions: StudentSessionSummary[] };

        if (isMounted) {
          const cutoff = Date.now() - SEVEN_DAYS_MS;
          const recent = payload.sessions.filter((session) => {
            if (!session.completedAt) return false;
            const time = new Date(session.completedAt).getTime();
            return Number.isFinite(time) && time >= cutoff;
          }).length;

          setSessions(payload.sessions);
          setLast7Days(recent);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível carregar seu histórico.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadSessions();

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  if (selectedSessionId) {
    return (
      <HistorySessionDetail
        sessionId={selectedSessionId}
        onBack={() => setSelectedSessionId(null)}
      />
    );
  }

  const totalSessions = sessions.length;
  const lastSessionDate = sessions[0]?.completedAt ?? sessions[0]?.startedAt ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico"
        description="Seus treinos concluídos, do mais recente ao mais antigo."
      />

      {!isLoading && !errorMessage && totalSessions > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <MetricCard label="Treinos" value={`${totalSessions}`} detail="concluídos" icon={CheckCircle2} />
          <MetricCard label="Últimos 7 dias" value={`${last7Days}`} detail="sessões" icon={BarChart3} />
          <MetricCard label="Último" value={formatShortDate(lastSessionDate)} icon={Calendar} />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={20} className="animate-spin text-accent" />
            <p className="text-xs text-muted">Carregando histórico...</p>
          </div>
        </div>
      )}

      {/* Error */}
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

      {/* Empty */}
      {!isLoading && !errorMessage && totalSessions === 0 && (
        <EmptyState
          icon={Dumbbell}
          title="Você ainda não concluiu nenhum treino"
          description="Quando você concluir um treino na sua área, ele aparece aqui com séries, reps e cargas registradas."
          action={{ label: "Ver meus treinos", href: "/app/treinos" }}
        />
      )}

      {/* List */}
      {!isLoading && !errorMessage && totalSessions > 0 && (
        <div className="space-y-2">
          {sessions.map((session) => (
            <HistorySessionCard
              key={session.id}
              session={session}
              onView={setSelectedSessionId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { isTrainer } = useAppShell();

  if (isTrainer) {
    return (
      <RoleGuard
        title="Histórico"
        description="O histórico de treinos fica disponível para quem usa o Move como aluno."
      />
    );
  }

  return <StudentHistory />;
}
