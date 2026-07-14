"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  Dumbbell,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  UserX,
} from "lucide-react";

import type { AdminStudentDetail, AdminStudentDetailResponse } from "@/bff/modules/admin/types";
import {
  UnauthenticatedRequestError,
  authenticatedFetch,
  readApiErrorMessage,
} from "@/services/api/authenticatedFetch";

import { useAppShell } from "../../../AppShellContext";
import { MetricCard, RoleGuard } from "../../../app-ui";

/* Rótulos estáveis para os eventos de vínculo (mesmos tipos do módulo admin). */
const EVENT_TYPE_LABELS: Record<string, string> = {
  relationship_activated: "Vínculo ativado",
  relationship_reactivated: "Vínculo reativado",
  relationship_removed_by_trainer: "Removido pelo personal",
  relationship_left_by_student: "Aluno saiu",
  invite_slug_generated: "Link de convite gerado",
  invite_link_opened: "Convite aberto",
};

const WORKOUT_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-success-soft text-success" },
  pending: { label: "Aguardando", className: "bg-surface-strong text-muted-foreground" },
};

function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function formatDateShort(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
      new Date(iso),
    );
  } catch {
    return "—";
  }
}

function formatEventDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function getInitials(name: string | null): string {
  if (!name) {
    return "?";
  }

  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return (parts[0]?.[0] ?? "?").toUpperCase();
}

/* ─── Conteúdo do detalhe ─── */
function StudentDetailContent({ studentId }: { studentId: string }) {
  const [student, setStudent] = useState<AdminStudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      setIsLoading(true);
      setErrorMessage(null);
      setNotFound(false);

      try {
        const response = await authenticatedFetch(`/api/v1/admin/students/${studentId}`, {
          method: "GET",
        });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (response.status === 404) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          setErrorMessage(
            await readApiErrorMessage(response, "Não foi possível carregar o aluno."),
          );
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as AdminStudentDetailResponse;

        if (isMounted) {
          setStudent(payload.student);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível carregar o aluno.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [studentId, reloadToken]);

  return (
    <div className="space-y-6">
      <Link
        href="/app/admin/alunos"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Alunos
      </Link>

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-16">
          <div className="flex flex-col items-center gap-2.5">
            <Loader2 size={22} className="animate-spin text-accent" />
            <p className="text-sm text-muted">Carregando aluno...</p>
          </div>
        </div>
      )}

      {!isLoading && notFound && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
          <UserX size={22} className="text-muted" />
          <p className="mt-2 text-sm font-medium text-foreground">Aluno não encontrado</p>
          <p className="mt-1 text-xs text-muted">
            Este usuário não existe ou não é um aluno do Move.
          </p>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
          <p className="text-sm text-red-500">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <RefreshCw size={14} />
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && !notFound && student && (
        <>
          {/* Header */}
          <div className="card-themed rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-muted text-lg font-semibold text-accent">
                {getInitials(student.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
                  {student.name ?? "Aluno sem nome"}
                </h1>
                {student.email && (
                  <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted">
                    <Mail size={14} className="shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-surface-strong px-2 py-1 text-[11px] font-medium text-muted-foreground">
                    <Calendar size={11} /> Conta criada em {formatDate(student.createdAt)}
                  </span>
                  {student.onboardingCompletedAt ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-success-soft px-2 py-1 text-[11px] font-medium text-success">
                      <CheckCircle2 size={11} /> Onboarding concluído
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-600">
                      <AlertTriangle size={11} /> Onboarding pendente
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Vínculo atual */}
            <div className="mt-4 rounded-xl border border-border bg-background px-4 py-3">
              {student.relationship ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted">
                      <Link2 size={11} /> Personal atual
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                      {student.relationship.trainerName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted">Desde</p>
                    <p className="text-xs font-medium text-foreground">
                      {formatDate(student.relationship.startedAt)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <UserX size={14} className="text-amber-600" />
                  Sem personal vinculado
                </p>
              )}

              {student.hasMultipleActiveTrainers && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600">
                  <AlertTriangle size={11} />
                  Mais de um vínculo ativo encontrado — exibindo o mais recente.
                </p>
              )}
            </div>
          </div>

          {/* Cards de atividade */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Treinos ativos"
              value={`${student.workouts.length}`}
              icon={Dumbbell}
            />
            <MetricCard
              label="Sessões"
              value={`${student.activity.completedSessions}`}
              detail="concluídas"
              icon={CheckCircle2}
            />
            <MetricCard
              label="Última sessão"
              value={formatDateShort(student.activity.lastCompletedSessionAt)}
              icon={Calendar}
            />
            <MetricCard
              label="Scans"
              value={`${student.activity.completedScans}`}
              detail={
                student.activity.lastScanAt
                  ? `último ${formatDateShort(student.activity.lastScanAt)}`
                  : "nenhum"
              }
              icon={Camera}
            />
          </div>

          {/* Conversas — apenas contagem */}
          <div className="card-themed flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-muted">
              <MessageCircle size={18} className="text-accent" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {student.activity.conversationCount} conversa
                {student.activity.conversationCount !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted">Contagem apenas — sem acesso ao conteúdo.</p>
            </div>
          </div>

          {/* Treinos */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Treinos ativos ({student.workouts.length})
            </h2>

            {student.workouts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-8 text-center">
                <Dumbbell size={20} className="mx-auto text-muted" strokeWidth={1.5} />
                <p className="mt-2 text-sm text-muted">Nenhum treino ativo atribuído.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {student.workouts.map((workout) => {
                  const badge = WORKOUT_STATUS_BADGE[workout.status] ?? {
                    label: workout.status,
                    className: "bg-surface-strong text-muted",
                  };

                  return (
                    <div
                      key={workout.id}
                      className="card-themed flex items-center gap-3.5 rounded-xl border border-border bg-surface px-4 py-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <Dumbbell size={18} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {workout.title}
                          </p>
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          Aplicado em {formatDate(workout.assignedAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Eventos de vínculo */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Eventos recentes de vínculo ({student.recentRelationshipEvents.length})
            </h2>

            {student.recentRelationshipEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-8 text-center">
                <p className="text-sm text-muted">Nenhum evento registrado.</p>
              </div>
            ) : (
              <div className="card-themed divide-y divide-border rounded-xl border border-border bg-surface px-4">
                {student.recentRelationshipEvents.map((event, index) => (
                  <div
                    key={`${event.eventType}-${event.occurredAt}-${index}`}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <p className="truncate text-sm text-foreground">
                      {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                    </p>
                    <span className="shrink-0 text-[11px] text-muted">
                      {formatEventDateTime(event.occurredAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Página ─── */
export default function AdminStudentDetailPage() {
  const { me } = useAppShell();
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;

  if (!me.isAdmin) {
    return (
      <RoleGuard title="Aluno" description="Esta área é restrita à administração do Move." />
    );
  }

  return <StudentDetailContent studentId={studentId} />;
}
