"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Link2,
  Loader2,
  MessageCircle,
  RefreshCw,
  User,
  Users,
} from "lucide-react";

import type {
  AdminAttentionResponse,
  AdminOverview,
  AdminRecentScanItem,
  AdminScanOverviewResponse,
  AdminScanStudentItem,
  AdminTrainerDetail,
  AdminTrainerListItem,
} from "@/bff/modules/admin/types";
import {
  UnauthenticatedRequestError,
  authenticatedFetch,
  readApiErrorMessage,
} from "@/services/api/authenticatedFetch";

import { useAppShell } from "../AppShellContext";
import { PageHeader, MetricCard, SectionCard, RoleGuard } from "../app-ui";

/* Stable, ordered labels for the events-by-type block. */
const EVENT_TYPE_LABELS: { type: string; label: string }[] = [
  { type: "relationship_activated", label: "Vínculos ativados" },
  { type: "relationship_reactivated", label: "Reativações" },
  { type: "relationship_removed_by_trainer", label: "Removidos pelo personal" },
  { type: "relationship_left_by_student", label: "Saídas de aluno" },
  { type: "invite_slug_generated", label: "Links de convite gerados" },
  { type: "invite_link_opened", label: "Convites abertos" },
];

function formatActivationDate(iso: string | null): string {
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

const EVENT_TYPE_LABEL_BY_TYPE: Record<string, string> = {};
for (const { type, label } of EVENT_TYPE_LABELS) {
  EVENT_TYPE_LABEL_BY_TYPE[type] = label;
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

const STUDENT_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-success-soft text-success" },
  pending: { label: "Pendente", className: "bg-surface-strong text-muted-foreground" },
  ended: { label: "Encerrado", className: "bg-surface-strong text-muted" },
};

function StudentStatusBadge({ status }: { status: string }) {
  const config = STUDENT_STATUS_BADGE[status] ?? {
    label: status,
    className: "bg-surface-strong text-muted",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

/* ─── Trainer detail (read-only) ─── */
function TrainerDetailSection({
  trainerUserId,
  onBack,
}: {
  trainerUserId: string;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<AdminTrainerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await authenticatedFetch(`/api/v1/admin/trainers/${trainerUserId}`, {
          method: "GET",
        });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setErrorMessage(
            await readApiErrorMessage(response, "Não foi possível carregar o personal."),
          );
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as { trainer: AdminTrainerDetail };

        if (isMounted) {
          setDetail(payload.trainer);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível carregar o personal.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [trainerUserId]);

  return (
    <SectionCard>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Voltar para a lista
      </button>

      {isLoading && (
        <div className="mt-4 flex items-center justify-center rounded-lg border border-dashed border-border bg-background py-10">
          <Loader2 size={18} className="animate-spin text-accent" />
        </div>
      )}

      {!isLoading && errorMessage && (
        <p className="mt-4 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-center text-xs text-red-500">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && detail && (
        <>
          <div className="mt-4 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">{detail.displayName}</h2>
              {detail.isInternalMoveTrainer && (
                <span className="inline-flex shrink-0 items-center rounded-full bg-accent/8 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  Interno
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {detail.email || "E-mail não disponível"}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Ativo desde {formatActivationDate(detail.activatedAt)}
            </p>
          </div>

          <div className="mt-5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
              Alunos vinculados ({detail.students.length})
            </h3>
            {detail.students.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-border bg-background px-4 py-5 text-center text-xs text-muted">
                Nenhum aluno vinculado.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {detail.students.map((student) => (
                  <div
                    key={student.studentUserId}
                    className="rounded-lg border border-border bg-background px-4 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {student.name}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {student.email || "E-mail não disponível"}
                        </p>
                      </div>
                      <StudentStatusBadge status={student.status} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      Desde {formatActivationDate(student.startedAt)}
                      {student.endedAt ? ` · encerrado em ${formatActivationDate(student.endedAt)}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
              Eventos recentes ({detail.recentEvents.length})
            </h3>
            {detail.recentEvents.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-border bg-background px-4 py-5 text-center text-xs text-muted">
                Nenhum evento registrado.
              </p>
            ) : (
              <div className="mt-2 divide-y divide-border">
                {detail.recentEvents.map((event, index) => (
                  <div
                    key={`${event.eventType}-${event.occurredAt}-${index}`}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">
                        {EVENT_TYPE_LABEL_BY_TYPE[event.eventType] ?? event.eventType}
                      </p>
                      <p className="truncate text-[11px] text-muted">
                        {event.actorRole} · {event.source}
                      </p>
                    </div>
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
    </SectionCard>
  );
}

/* ─── Trainers list (read-only) ─── */
function TrainersSection() {
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
  const [trainers, setTrainers] = useState<AdminTrainerListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadTrainers() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await authenticatedFetch("/api/v1/admin/trainers", { method: "GET" });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setErrorMessage(
            await readApiErrorMessage(response, "Não foi possível carregar os personais."),
          );
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as { trainers: AdminTrainerListItem[] };

        if (isMounted) {
          setTrainers(payload.trainers);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível carregar os personais.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadTrainers();

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  if (selectedTrainerId) {
    return (
      <TrainerDetailSection
        trainerUserId={selectedTrainerId}
        onBack={() => setSelectedTrainerId(null)}
      />
    );
  }

  return (
    <SectionCard>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-muted">
          <Users size={18} className="text-accent" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Personais</h2>
          <p className="text-xs text-muted">Personais cadastrados no Move.</p>
        </div>
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center justify-center rounded-lg border border-dashed border-border bg-background py-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={18} className="animate-spin text-accent" />
            <p className="text-xs text-muted">Carregando personais...</p>
          </div>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background px-6 py-10 text-center">
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

      {!isLoading && !errorMessage && trainers.length === 0 && (
        <p className="mt-4 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-center text-xs text-muted">
          Nenhum personal cadastrado ainda.
        </p>
      )}

      {!isLoading && !errorMessage && trainers.length > 0 && (
        <div className="mt-4 space-y-2">
          {trainers.map((trainer) => (
            <button
              key={trainer.userId}
              type="button"
              onClick={() => setSelectedTrainerId(trainer.userId)}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-surface-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {trainer.displayName}
                    </p>
                    {trainer.isInternalMoveTrainer && (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-accent/8 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        Interno
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted">
                    {trainer.email || "E-mail não disponível"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted">Ativo desde</p>
                    <p className="text-xs font-medium text-foreground">
                      {formatActivationDate(trainer.activatedAt)}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-muted" />
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                <span>
                  <strong className="text-foreground">{trainer.activeStudentCount}</strong> alunos
                  ativos
                </span>
                <span>
                  <strong className="text-foreground">{trainer.endedRelationshipCount}</strong>{" "}
                  encerrados
                </span>
                <span>
                  <strong className="text-foreground">{trainer.totalRelationshipCount}</strong> no
                  total
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

const SCAN_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  completed: { label: "Concluído", className: "bg-success-soft text-success" },
  processing: { label: "Processando", className: "bg-accent/8 text-accent" },
  draft: { label: "Rascunho", className: "bg-surface-strong text-muted-foreground" },
  failed: { label: "Falhou", className: "bg-red-50 text-red-600" },
  rejected: { label: "Rejeitado", className: "bg-surface-strong text-muted" },
};

function ScanStatusBadge({ status }: { status: string }) {
  const config = SCAN_STATUS_BADGE[status] ?? {
    label: status,
    className: "bg-surface-strong text-muted",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function formatScanDate(iso: string | null): string {
  if (!iso) return "—";
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

function ScanSection() {
  const [data, setData] = useState<AdminScanOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadScans() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await authenticatedFetch("/api/v1/admin/scans", { method: "GET" });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setErrorMessage(
            await readApiErrorMessage(response, "Não foi possível carregar os dados de scan."),
          );
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as AdminScanOverviewResponse;

        if (isMounted) {
          setData(payload);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível carregar os dados de scan.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadScans();

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  return (
    <SectionCard>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-muted">
          <Camera size={18} className="text-accent" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Scan corporal</h2>
          <p className="text-xs text-muted">Análises realizadas pelos alunos.</p>
        </div>
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center justify-center rounded-lg border border-dashed border-border bg-background py-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={18} className="animate-spin text-accent" />
            <p className="text-xs text-muted">Carregando dados de scan...</p>
          </div>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background px-6 py-10 text-center">
          <p className="text-xs text-red-500">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setReloadToken((t) => t + 1)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <RefreshCw size={12} />
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && data && (
        <>
          {/* Summary grid */}
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted">Total</p>
              <p className="mt-0.5 text-lg font-semibold text-foreground">
                {data.summary.totalAnalyses}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted">Concluídos</p>
              <p className="mt-0.5 text-lg font-semibold text-success">
                {data.summary.completedCount}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted">Alunos</p>
              <p className="mt-0.5 text-lg font-semibold text-foreground">
                {data.summary.uniqueStudentsCount}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted">Últimos 30d</p>
              <p className="mt-0.5 text-lg font-semibold text-foreground">
                {data.summary.analysesLast30Days}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted">Bônus</p>
              <p className="mt-0.5 text-lg font-semibold text-foreground">
                {data.summary.bonusAnalysesCount}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted">Falhas</p>
              <p className="mt-0.5 text-lg font-semibold text-foreground">
                {data.summary.failedCount + data.summary.rejectedCount}
              </p>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="mt-4 divide-y divide-border">
            {(
              [
                { key: "completedCount", label: "Concluídos" },
                { key: "processingCount", label: "Processando" },
                { key: "draftCount", label: "Rascunho" },
                { key: "failedCount", label: "Falhou" },
                { key: "rejectedCount", label: "Rejeitados" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-2">
                <span className="text-sm text-muted">{label}</span>
                <span className="text-sm font-semibold text-foreground">{data.summary[key]}</span>
              </div>
            ))}
          </div>

          {/* Students list */}
          <div className="mt-5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
              Alunos com análises ({data.students.length})
            </h3>
            {data.students.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-border bg-background px-4 py-5 text-center text-xs text-muted">
                Nenhuma análise realizada ainda.
              </p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {data.students.map((student: AdminScanStudentItem) => (
                  <div
                    key={student.studentUserId}
                    className="rounded-lg border border-border bg-background px-4 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {student.studentName ?? "Aluno sem nome"}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {student.studentEmail ?? student.studentUserId}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {student.lastStatus && <ScanStatusBadge status={student.lastStatus} />}
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted">
                      <span>
                        <strong className="text-foreground">{student.totalAnalyses}</strong>{" "}
                        análise{student.totalAnalyses !== 1 ? "s" : ""}
                      </span>
                      <span>
                        <strong className="text-foreground">{student.completedCount}</strong>{" "}
                        concluída{student.completedCount !== 1 ? "s" : ""}
                      </span>
                      {student.lastBodyFatPercent !== null && (
                        <span>
                          <strong className="text-foreground">
                            {student.lastBodyFatPercent.toFixed(1)}%
                          </strong>{" "}
                          gordura (último)
                        </span>
                      )}
                      <span>Último: {formatScanDate(student.lastScanAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent scans */}
          <div className="mt-5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
              Análises recentes (últimas {data.recentScans.length})
            </h3>
            {data.recentScans.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-border bg-background px-4 py-5 text-center text-xs text-muted">
                Nenhuma análise registrada ainda.
              </p>
            ) : (
              <div className="mt-2 divide-y divide-border">
                {data.recentScans.map((scan: AdminRecentScanItem) => (
                  <div key={scan.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">
                        {scan.studentName ?? scan.studentEmail ?? scan.studentUserId}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                        <span>{formatScanDate(scan.createdAt)}</span>
                        {scan.allowanceType === "bonus" && (
                          <span className="rounded-full bg-accent/8 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                            bônus
                          </span>
                        )}
                        {scan.bodyFatPercent !== null && (
                          <span>{scan.bodyFatPercent.toFixed(1)}% gordura</span>
                        )}
                      </div>
                    </div>
                    <ScanStatusBadge status={scan.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </SectionCard>
  );
}

/* ─── Pontos de atenção (listas operacionais) ─── */

type AttentionRow = {
  key: string;
  primary: string;
  detail: string;
  badge: string;
};

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function AttentionList({ title, rows }: { title: string; rows: AttentionRow[] }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>

      {rows.length === 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
          <CheckCircle2 size={14} className="shrink-0 text-success" />
          Nenhum caso encontrado
        </p>
      ) : (
        <ul className="mt-1.5 divide-y divide-border">
          {rows.map((row) => (
            <li key={row.key} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{row.primary}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{row.detail}</p>
              </div>
              <span className="mt-0.5 inline-flex max-w-[45%] shrink-0 items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-right text-[10px] font-semibold leading-tight text-amber-600">
                {row.badge}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function buildStudentWithoutWorkoutRows(
  attention: AdminAttentionResponse,
): AttentionRow[] {
  return attention.studentsWithoutWorkout.map((item) => ({
    key: item.studentUserId,
    primary: item.studentName ?? item.studentEmail ?? "Aluno sem nome",
    detail: `Personal: ${item.trainerName ?? "—"} · vínculo desde ${formatActivationDate(item.relationshipStartedAt)}`,
    badge: item.reason,
  }));
}

function buildStalledStudentRows(attention: AdminAttentionResponse): AttentionRow[] {
  return attention.studentsWithoutRecentSession.map((item) => ({
    key: item.studentUserId,
    primary: item.studentName ?? "Aluno sem nome",
    detail: [
      `Personal: ${item.trainerName ?? "—"}`,
      item.lastSessionAt
        ? `última sessão ${formatActivationDate(item.lastSessionAt)}`
        : "nenhuma sessão registrada",
      pluralize(item.activeWorkoutCount, "treino", "treinos"),
    ].join(" · "),
    badge: item.reason,
  }));
}

function buildTrainerWithoutStudentsRows(
  attention: AdminAttentionResponse,
): AttentionRow[] {
  return attention.trainersWithoutStudents.map((item) => ({
    key: item.trainerUserId,
    primary: item.trainerName,
    detail: `${item.trainerEmail ?? "—"} · ativo desde ${formatActivationDate(item.activatedAt)}`,
    badge: item.reason,
  }));
}

function buildTrainerWithoutWorkoutsRows(
  attention: AdminAttentionResponse,
): AttentionRow[] {
  return attention.trainersWithoutWorkouts.map((item) => ({
    key: item.trainerUserId,
    primary: item.trainerName,
    detail: [
      pluralize(item.activeStudentCount, "aluno ativo", "alunos ativos"),
      item.trainerEmail ?? "—",
    ].join(" · "),
    badge: item.reason,
  }));
}

function AttentionSection() {
  const [attention, setAttention] = useState<AdminAttentionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadAttention() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await authenticatedFetch("/api/v1/admin/attention", {
          method: "GET",
        });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setErrorMessage(
            await readApiErrorMessage(
              response,
              "Não foi possível carregar os pontos de atenção.",
            ),
          );
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as AdminAttentionResponse;

        if (isMounted) {
          setAttention(payload);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível carregar os pontos de atenção.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadAttention();

    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  return (
    <SectionCard>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-muted">
          <AlertTriangle size={18} className="text-accent" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Pontos de atenção</h2>
          <p className="text-xs text-muted">
            Alunos e profissionais que podem precisar de ação nos primeiros dias.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Loader2 size={16} className="animate-spin text-accent" />
          Carregando pontos de atenção...
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="mt-4 flex flex-col items-start gap-3">
          <p className="text-xs text-red-500">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <RefreshCw size={12} />
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && attention && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <AttentionList
            title="Alunos sem treino"
            rows={buildStudentWithoutWorkoutRows(attention)}
          />
          <AttentionList
            title="Alunos sem sessão recente"
            rows={buildStalledStudentRows(attention)}
          />
          <AttentionList
            title="Personais sem alunos"
            rows={buildTrainerWithoutStudentsRows(attention)}
          />
          <AttentionList
            title="Personais sem treino"
            rows={buildTrainerWithoutWorkoutsRows(attention)}
          />
        </div>
      )}
    </SectionCard>
  );
}

export default function AdminPage() {
  const { me } = useAppShell();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!me.isAdmin) {
      return;
    }

    let isMounted = true;

    async function loadOverview() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await authenticatedFetch("/api/v1/admin/overview", { method: "GET" });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setErrorMessage(
            await readApiErrorMessage(response, "Não foi possível carregar o overview."),
          );
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as AdminOverview;

        if (isMounted) {
          setOverview(payload);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível carregar o overview.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      isMounted = false;
    };
  }, [me.isAdmin, reloadToken]);

  if (!me.isAdmin) {
    return (
      <RoleGuard
        title="Admin"
        description="Esta área é restrita à administração do Move."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="Visão geral operacional do Move (somente leitura)."
      />

      {isLoading && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={20} className="animate-spin text-accent" />
            <p className="text-xs text-muted">Carregando métricas...</p>
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

      {!isLoading && !errorMessage && overview && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Personais"
              value={`${overview.trainerCount}`}
              detail={
                overview.internalTrainerCount > 0
                  ? `${overview.internalTrainerCount} interno${overview.internalTrainerCount > 1 ? "s" : ""} Move`
                  : undefined
              }
              icon={Users}
            />
            <MetricCard label="Alunos" value={`${overview.studentCount}`} icon={User} />
            <MetricCard label="Vínculos ativos" value={`${overview.activeRelationshipCount}`} icon={Link2} />
            <MetricCard label="Treinos atribuídos" value={`${overview.usage.assignedWorkouts}`} icon={Dumbbell} />
            <MetricCard label="Sessões concluídas" value={`${overview.usage.completedSessions}`} icon={CheckCircle2} />
            <MetricCard label="Scans concluídos" value={`${overview.usage.completedScans}`} icon={Camera} />
            <MetricCard label="Mensagens humanas" value={`${overview.usage.humanMessages}`} icon={MessageCircle} />
            <MetricCard
              label="Aguardando personal"
              value={`${overview.usage.waitingForTrainerConversations}`}
              detail="Conversas com IA pausada"
              icon={Clock}
            />
          </div>

          <SectionCard>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-muted">
                  <Users size={18} className="text-accent" strokeWidth={1.8} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Alunos</h2>
                  <p className="text-xs text-muted">Lista completa, busca e detalhe.</p>
                </div>
              </div>
              <Link
                href="/app/admin/alunos"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-on transition-colors hover:bg-accent-hover"
              >
                Ver todos os alunos
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-center">
                <p className="text-lg font-semibold text-foreground">{overview.studentCount}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted">Total</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-center">
                <p className="text-lg font-semibold text-success">
                  {overview.activeStudentCount}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted">Com personal</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-center">
                <p className="text-lg font-semibold text-amber-600">
                  {Math.max(0, overview.studentCount - overview.activeStudentCount)}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted">Sem personal</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-muted">
                <Activity size={18} className="text-accent" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Últimos 7 dias</h2>
                <p className="text-xs text-muted">Pulso de uso recente do produto.</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: "Sessões concluídas", value: overview.last7Days.completedSessions },
                { label: "Scans", value: overview.last7Days.scans },
                { label: "Mensagens humanas", value: overview.last7Days.humanMessages },
                { label: "Novos vínculos", value: overview.last7Days.newRelationships },
                { label: "Eventos de vínculo", value: overview.last7Days.relationshipEvents },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border bg-background px-3 py-2.5"
                >
                  <p className="text-lg font-semibold tracking-tight text-foreground">
                    {item.value}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-muted">{item.label}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-muted">
                <BarChart3 size={18} className="text-accent" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Eventos por tipo</h2>
                <p className="text-xs text-muted">Últimos 30 dias.</p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-border">
              {EVENT_TYPE_LABELS.map(({ type, label }) => (
                <div key={type} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-muted">{label}</span>
                  <span className="text-sm font-semibold text-foreground">
                    {overview.eventsByTypeLast30Days[type] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}

      <AttentionSection />
      <TrainersSection />
      <ScanSection />
    </div>
  );
}
