"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  UserX,
  X,
} from "lucide-react";

import type {
  AdminStudentFilter,
  AdminStudentListItem,
  AdminStudentListResponse,
  AdminStudentSort,
} from "@/bff/modules/admin/types";
import {
  UnauthenticatedRequestError,
  authenticatedFetch,
  readApiErrorMessage,
} from "@/services/api/authenticatedFetch";

import { useAppShell } from "../../AppShellContext";
import { PageHeader, RoleGuard, SectionCard } from "../../app-ui";

const FILTER_OPTIONS: ReadonlyArray<{ key: AdminStudentFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "with_trainer", label: "Com personal" },
  { key: "without_trainer", label: "Sem personal" },
];

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

/* ─── Badge com/sem personal ─── */
function TrainerBadge({ hasTrainer }: { hasTrainer: boolean }) {
  if (hasTrainer) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
        <Link2 size={10} />
        Com personal
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
      <UserX size={10} />
      Sem personal
    </span>
  );
}

/* ─── Card do aluno ─── */
function StudentCard({ student }: { student: AdminStudentListItem }) {
  const hasTrainer = student.trainer !== null;
  const initial = (student.name ?? "?").charAt(0).toUpperCase();

  return (
    <Link
      href={`/app/admin/alunos/${student.studentUserId}`}
      className="card-themed group flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-hover"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-muted text-sm font-semibold text-accent">
        {initial}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {student.name ?? "Aluno sem nome"}
          </p>
          {student.hasMultipleActiveTrainers && (
            <span
              title="Mais de um vínculo ativo — exibindo o mais recente"
              className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600"
            >
              <AlertTriangle size={9} /> Vínculo ambíguo
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted">
          {student.email || "E-mail não disponível"}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
          <TrainerBadge hasTrainer={hasTrainer} />
          {hasTrainer && student.trainer && (
            <span className="truncate">{student.trainer.name}</span>
          )}
          <span className="text-border">·</span>
          <span className="inline-flex items-center gap-1">
            <Dumbbell size={11} />
            {student.activeWorkoutCount > 0
              ? `${student.activeWorkoutCount} treino${student.activeWorkoutCount !== 1 ? "s" : ""}`
              : "Sem treino"}
          </span>
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
          <span>Criado em {formatDate(student.createdAt)}</span>
          <span className="text-border">·</span>
          <span>
            {student.lastCompletedSessionAt
              ? `Última sessão ${formatDate(student.lastCompletedSessionAt)}`
              : "Nenhuma sessão concluída"}
          </span>
        </div>
      </div>

      <ChevronRight
        size={18}
        className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
      />
    </Link>
  );
}

/* ─── Resumo curto ─── */
function SummaryRow({
  totalStudents,
  withTrainer,
  withoutTrainer,
}: {
  totalStudents: number;
  withTrainer: number;
  withoutTrainer: number;
}) {
  const cells = [
    { label: "Total", value: totalStudents },
    { label: "Com personal", value: withTrainer },
    { label: "Sem personal", value: withoutTrainer },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="rounded-lg border border-border bg-background px-3 py-2.5 text-center"
        >
          <p className="text-lg font-semibold text-foreground">{cell.value}</p>
          <p className="mt-0.5 text-[11px] leading-tight text-muted">{cell.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Página ─── */
export default function AdminStudentsPage() {
  const { me } = useAppShell();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<AdminStudentFilter>("all");
  const [sort, setSort] = useState<AdminStudentSort>("newest");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<AdminStudentListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Debounce da busca (evita refetch a cada tecla).
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!me.isAdmin) {
      return;
    }

    let isMounted = true;

    async function loadStudents() {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("filter", filter);
      params.set("sort", sort);
      params.set("page", String(page));

      try {
        const response = await authenticatedFetch(`/api/v1/admin/students?${params.toString()}`, {
          method: "GET",
        });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setErrorMessage(
            await readApiErrorMessage(response, "Não foi possível carregar os alunos."),
          );
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as AdminStudentListResponse;

        if (isMounted) {
          setData(payload);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof UnauthenticatedRequestError
              ? "Sua sessão expirou. Entre novamente."
              : "Não foi possível carregar os alunos.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadStudents();

    return () => {
      isMounted = false;
    };
  }, [me.isAdmin, debouncedSearch, filter, sort, page, reloadToken]);

  if (!me.isAdmin) {
    return (
      <RoleGuard
        title="Alunos"
        description="Esta área é restrita à administração do Move."
      />
    );
  }

  function handleFilterChange(next: AdminStudentFilter) {
    setFilter(next);
    setPage(1);
  }

  function handleSortChange(next: AdminStudentSort) {
    setSort(next);
    setPage(1);
  }

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? null;
  const summary = data?.summary ?? null;

  return (
    <div className="space-y-6">
      <Link
        href="/app/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Admin
      </Link>

      <PageHeader title="Alunos" description="Todos os alunos cadastrados no Move." />

      {summary && (
        <SummaryRow
          totalStudents={summary.totalStudents}
          withTrainer={summary.withTrainer}
          withoutTrainer={summary.withoutTrainer}
        />
      )}

      <SectionCard>
        {/* Busca */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou e-mail"
            aria-label="Buscar aluno"
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-9 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filtros + ordenação */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {FILTER_OPTIONS.map((option) => {
            const isActive = filter === option.key;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => handleFilterChange(option.key)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "border-accent/40 bg-accent-soft text-accent"
                    : "border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}

          <label className="ml-auto inline-flex items-center gap-1.5">
            <span className="sr-only">Ordenar alunos</span>
            <select
              value={sort}
              onChange={(event) => handleSortChange(event.target.value as AdminStudentSort)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
            >
              <option value="newest">Mais recentes</option>
              <option value="name">Nome (A–Z)</option>
            </select>
          </label>
        </div>

        {/* Estado: carregando */}
        {isLoading && (
          <div className="mt-4 flex items-center justify-center rounded-lg border border-dashed border-border bg-background py-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={18} className="animate-spin text-accent" />
              <p className="text-xs text-muted">Carregando alunos...</p>
            </div>
          </div>
        )}

        {/* Estado: erro */}
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

        {/* Estado: vazio */}
        {!isLoading && !errorMessage && items.length === 0 && (
          <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background px-6 py-10 text-center">
            <CheckCircle2 size={20} className="text-muted" />
            <p className="mt-2 text-sm text-muted">
              {debouncedSearch || filter !== "all"
                ? "Nenhum aluno encontrado com esses filtros."
                : "Nenhum aluno cadastrado ainda."}
            </p>
            {(debouncedSearch || filter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                  setPage(1);
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* Lista */}
        {!isLoading && !errorMessage && items.length > 0 && (
          <div className="mt-4 space-y-2">
            {items.map((student) => (
              <StudentCard key={student.studentUserId} student={student} />
            ))}
          </div>
        )}

        {/* Paginação */}
        {!isLoading && !errorMessage && pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Anterior
            </button>

            <span className="text-xs text-muted">
              Página {pagination.page} de {pagination.totalPages} · {pagination.total} aluno
              {pagination.total !== 1 ? "s" : ""}
            </span>

            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="inline-flex items-center gap-1 rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
