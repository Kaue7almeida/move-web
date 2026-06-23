"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Users, UserPlus, UserCheck, Clock, Mail, User as UserIcon, RefreshCw, Link2, Copy, Check, MoreVertical, Search, X, ChevronRight, Dumbbell, Sparkles } from "lucide-react";

import type {
  TrainerStudentLinkResponse,
  TrainerStudentListItem,
  TrainerStudentListResponse,
} from "@/bff/modules/profile/types";
import {
  UnauthenticatedRequestError,
  authenticatedFetch,
  readApiErrorMessage,
} from "@/services/api/authenticatedFetch";

import { useAppShell } from "../AppShellContext";
import { PageHeader, MetricCard, EmptyState, RoleGuard, SectionCard } from "../app-ui";
import { ConfirmActionModal } from "../_components/ConfirmActionModal";

type TrainerStudentFormState = {
  studentName: string;
  studentEmail: string;
};

type StudentFilter = "all" | "new" | "withoutWorkout";
type StudentSort = "recent" | "name";

/** Janela para considerar um vínculo "novo". */
const NEW_STUDENT_WINDOW_DAYS = 14;

function isRecentlyLinked(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();

  if (Number.isNaN(created)) {
    return false;
  }

  const windowMs = NEW_STUDENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - created <= windowMs;
}

function formatLinkDate(iso: string): string | null {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─── Invite link card ─── */
function InviteLinkCard({ inviteSlug }: { inviteSlug: string | null }) {
  const [copied, setCopied] = useState(false);
  const [isLoadingSlug, setIsLoadingSlug] = useState(!inviteSlug);
  const [slug, setSlug] = useState(inviteSlug);
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) return;

    let isMounted = true;

    async function loadSlug() {
      try {
        const response = await authenticatedFetch("/api/v1/trainer/invite-slug", {
          method: "GET",
        });

        if (!isMounted) return;

        if (!response.ok) {
          setSlugError("Não foi possível gerar o link.");
          setIsLoadingSlug(false);
          return;
        }

        const payload = (await response.json()) as { inviteSlug: string };

        if (isMounted) {
          setSlug(payload.inviteSlug);
          setIsLoadingSlug(false);
        }
      } catch {
        if (isMounted) {
          setSlugError("Não foi possível gerar o link.");
          setIsLoadingSlug(false);
        }
      }
    }

    void loadSlug();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const inviteUrl = slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/convite/${slug}`
    : "";

  async function handleCopy() {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text for manual copy
    }
  }

  return (
    <SectionCard>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-muted">
          <Link2 size={18} className="text-accent" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Link de convite</h2>
          <p className="text-xs text-muted">
            Envie este link para seus alunos
          </p>
        </div>
      </div>

      {isLoadingSlug && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-xs text-muted">Gerando link...</span>
        </div>
      )}

      {slugError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-xs text-red-500">
          {slugError}
        </div>
      )}

      {slug && !isLoadingSlug && (
        <>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5">
              <p className="truncate text-xs text-muted-foreground font-mono">
                {inviteUrl}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors",
                copied
                  ? "border-green-600/30 bg-green-600/10 text-green-600"
                  : "border-border bg-surface-strong text-foreground hover:bg-surface-hover",
              ].join(" ")}
              title="Copiar link"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p className="mt-3 text-[11px] text-muted leading-relaxed">
            O aluno abre esse link, cria uma conta (ou entra na que já tem) e aceita o
            convite. Depois disso ele aparece na sua lista.
          </p>
        </>
      )}
    </SectionCard>
  );
}

/* ─── Add student form ─── */
function AddStudentForm({
  onStudentAdded,
}: {
  onStudentAdded: (payload: TrainerStudentLinkResponse) => void;
}) {
  const [formState, setFormState] = useState<TrainerStudentFormState>({
    studentName: "",
    studentEmail: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    if (!formState.studentName.trim() || !formState.studentEmail.trim()) {
      setErrorMessage("Preencha o nome e o e-mail do aluno.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await authenticatedFetch("/api/v1/trainer/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: formState.studentName,
          studentEmail: formState.studentEmail,
        }),
      });

      if (response.status === 401) {
        throw new UnauthenticatedRequestError();
      }

      if (!response.ok) {
        setErrorMessage(
          await readApiErrorMessage(response, "Não foi possível adicionar esse aluno."),
        );
        return;
      }

      const payload = (await response.json()) as TrainerStudentLinkResponse;
      onStudentAdded(payload);
      setSuccessMessage(`${payload.student.fullName} foi adicionado ao seu espaço.`);
      setFormState({ studentName: "", studentEmail: "" });
    } catch (error: unknown) {
      if (error instanceof UnauthenticatedRequestError) {
        setErrorMessage("Sua sessão expirou. Entre novamente.");
      } else {
        setErrorMessage("Não foi possível adicionar esse aluno.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SectionCard>
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-muted">
          <UserPlus size={18} className="text-accent" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Adicionar aluno</h2>
          <p className="text-xs text-muted">
            Use o e-mail da conta que o aluno já tem no Move
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Nome do aluno
          </label>
          <div className="relative">
            <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={formState.studentName}
              onChange={(e) => setFormState((s) => ({ ...s, studentName: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              placeholder="Ex: Maria Silva"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            E-mail do aluno
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="email"
              value={formState.studentEmail}
              onChange={(e) => setFormState((s) => ({ ...s, studentEmail: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              placeholder="aluno@email.com"
              required
            />
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-xs text-red-500">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg border border-green-600/20 bg-green-600/5 px-3 py-2.5 text-xs text-green-600">
            {successMessage}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-muted">
            O aluno precisa ter uma conta no Move.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserPlus size={14} />
            {isSubmitting ? "Adicionando..." : "Adicionar"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

/* ─── Status badge ─── */
function StudentStatusBadge({ status }: { status: string }) {
  const isActive = status === "active";

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium",
        isActive ? "bg-success-soft text-success" : "bg-surface-strong text-muted",
      ].join(" ")}
    >
      {isActive ? (
        <>
          <UserCheck size={11} /> Ativo
        </>
      ) : (
        <>
          <Clock size={11} /> Pendente
        </>
      )}
    </span>
  );
}

/* ─── Student meta (treinos + vínculo) ─── */
function StudentMeta({ student }: { student: TrainerStudentListItem }) {
  const isActive = student.status === "active";
  const linkedAt = formatLinkDate(student.createdAt);

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
      {isActive && (
        <span className="inline-flex items-center gap-1">
          <Dumbbell size={12} className="text-muted" />
          {student.activeWorkoutCount > 0
            ? `${student.activeWorkoutCount} treino${student.activeWorkoutCount !== 1 ? "s" : ""}`
            : "Sem treino"}
        </span>
      )}
      {isActive && linkedAt && <span className="text-border">·</span>}
      {linkedAt && <span>Desde {linkedAt}</span>}
    </div>
  );
}

/* ─── Student row ─── */
function StudentRow({
  student,
  onRequestRemove,
}: {
  student: TrainerStudentListItem;
  onRequestRemove: (student: TrainerStudentListItem) => void;
}) {
  const initial = student.fullName.charAt(0).toUpperCase();
  const isActive = student.status === "active";
  const isNew = isRecentlyLinked(student.createdAt);
  const [menuOpen, setMenuOpen] = useState(false);

  const avatar = (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-muted text-sm font-semibold text-accent">
      {initial}
    </div>
  );

  const identity = (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="truncate text-sm font-semibold text-foreground">{student.fullName}</p>
        {isNew && (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            <Sparkles size={9} /> Novo
          </span>
        )}
      </div>
      <p className="truncate text-sm text-muted">
        {student.email || "E-mail não disponível"}
      </p>
      <StudentMeta student={student} />
    </div>
  );

  return (
    <div className="card-themed flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      {isActive ? (
        <Link
          href={`/app/alunos/${student.userId}`}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg transition-colors"
        >
          {avatar}
          {identity}
          <ChevronRight
            size={18}
            className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          />
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {avatar}
          {identity}
        </div>
      )}

      <StudentStatusBadge status={student.status} />

      {isActive && (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Mais ações"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                onKeyDown={() => {}}
                role="presentation"
              />
              <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                <Link
                  href={`/app/alunos/${student.userId}`}
                  className="block w-full px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
                >
                  Ver aluno
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onRequestRemove(student);
                  }}
                  className="block w-full px-3 py-2.5 text-left text-sm font-medium text-red-500 transition-colors hover:bg-surface-hover"
                >
                  Remover aluno
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Student list ─── */
function StudentList({
  students,
  isLoading,
  errorMessage,
  onRetry,
  onRequestRemove,
}: {
  students: TrainerStudentListItem[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onRequestRemove: (student: TrainerStudentListItem) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Seus alunos</h3>
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-12">
          <div className="flex flex-col items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-xs text-muted">Carregando alunos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Seus alunos</h3>
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
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Seus alunos</h3>
        <EmptyState
          icon={Users}
          title="Nenhum aluno ainda"
          description="Adicione seu primeiro aluno usando o formulário acima. Ele precisa ter uma conta no Move."
        />
      </div>
    );
  }

  return (
    <StudentListContent students={students} onRequestRemove={onRequestRemove} />
  );
}

/* ─── Student list content (search + filters + sort) ─── */
const FILTER_OPTIONS: ReadonlyArray<{ key: StudentFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "new", label: "Novos" },
  { key: "withoutWorkout", label: "Sem treino" },
];

function StudentListContent({
  students,
  onRequestRemove,
}: {
  students: TrainerStudentListItem[];
  onRequestRemove: (student: TrainerStudentListItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("all");
  const [sort, setSort] = useState<StudentSort>("recent");

  const counts = useMemo(
    () => ({
      all: students.length,
      new: students.filter((student) => isRecentlyLinked(student.createdAt)).length,
      withoutWorkout: students.filter(
        (student) => student.status === "active" && student.activeWorkoutCount === 0,
      ).length,
    }),
    [students],
  );

  const visibleStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = students.filter((student) => {
      if (filter === "new" && !isRecentlyLinked(student.createdAt)) {
        return false;
      }

      if (
        filter === "withoutWorkout"
        && !(student.status === "active" && student.activeWorkoutCount === 0)
      ) {
        return false;
      }

      if (normalizedQuery) {
        const haystack = `${student.fullName} ${student.email}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      }

      return true;
    });

    return filtered.sort((left, right) => {
      if (sort === "name") {
        return left.fullName.localeCompare(right.fullName, "pt-BR");
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [students, query, filter, sort]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">
          Seus alunos ({students.length})
        </h3>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome ou e-mail"
          aria-label="Buscar aluno"
          className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-9 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filtros + ordenação */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_OPTIONS.map((option) => {
          const isActive = filter === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground",
              ].join(" ")}
            >
              {option.label}
              <span className={isActive ? "text-accent" : "text-muted"}>
                {counts[option.key]}
              </span>
            </button>
          );
        })}

        <label className="ml-auto inline-flex items-center gap-1.5">
          <span className="sr-only">Ordenar alunos</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as StudentSort)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
          >
            <option value="recent">Mais recentes</option>
            <option value="name">Nome (A–Z)</option>
          </select>
        </label>
      </div>

      {/* Lista */}
      {visibleStudents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-10 text-center">
          <p className="text-sm text-muted">Nenhum aluno encontrado com esses filtros.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleStudents.map((student) => (
            <StudentRow
              key={student.userId}
              student={student}
              onRequestRemove={onRequestRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─── */
export default function StudentsPage() {
  const { setMe, isTrainer } = useAppShell();
  const [students, setStudents] = useState<TrainerStudentListItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [listErrorMessage, setListErrorMessage] = useState<string | null>(null);
  const [removingStudent, setRemovingStudent] = useState<TrainerStudentListItem | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTrainer) return;

    let isMounted = true;

    async function loadStudents() {
      try {
        const response = await authenticatedFetch("/api/v1/trainer/students", {
          method: "GET",
        });

        if (!isMounted) return;

        if (response.status === 401) {
          throw new UnauthenticatedRequestError();
        }

        if (!response.ok) {
          setListErrorMessage(
            await readApiErrorMessage(response, "Não foi possível carregar seus alunos."),
          );
          setIsLoadingStudents(false);
          return;
        }

        const payload = (await response.json()) as TrainerStudentListResponse;

        if (isMounted) {
          setStudents(payload.students);
          setIsLoadingStudents(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          if (error instanceof UnauthenticatedRequestError) {
            setListErrorMessage("Sua sessão expirou. Entre novamente.");
          } else {
            setListErrorMessage("Não foi possível carregar seus alunos.");
          }
          setIsLoadingStudents(false);
        }
      }
    }

    void loadStudents();

    return () => {
      isMounted = false;
    };
  }, [isTrainer]);

  /* Retry handler — triggered by user click, not by an effect */
  async function handleRetry() {
    setIsLoadingStudents(true);
    setListErrorMessage(null);

    try {
      const response = await authenticatedFetch("/api/v1/trainer/students", {
        method: "GET",
      });

      if (response.status === 401) {
        throw new UnauthenticatedRequestError();
      }

      if (!response.ok) {
        setListErrorMessage(
          await readApiErrorMessage(response, "Não foi possível carregar seus alunos."),
        );
        return;
      }

      const payload = (await response.json()) as TrainerStudentListResponse;
      setStudents(payload.students);
    } catch (error: unknown) {
      if (error instanceof UnauthenticatedRequestError) {
        setListErrorMessage("Sua sessão expirou. Entre novamente.");
      } else {
        setListErrorMessage("Não foi possível carregar seus alunos.");
      }
    } finally {
      setIsLoadingStudents(false);
    }
  }

  if (!isTrainer) {
    return (
      <RoleGuard
        title="Alunos"
        description="Essa área é exclusiva para quem usa o Move como personal."
      />
    );
  }

  function handleStudentAdded(payload: TrainerStudentLinkResponse) {
    setMe(payload.me);

    // Add the new student to the top of the list
    const newStudent: TrainerStudentListItem = {
      userId: payload.student.userId,
      fullName: payload.student.fullName,
      email: payload.student.email,
      status: payload.student.relationshipStatus,
      createdAt: new Date().toISOString(),
      activeWorkoutCount: 0,
    };

    setStudents((current) => [newStudent, ...current]);
  }

  async function handleConfirmRemove() {
    if (!removingStudent) return;

    setIsRemoving(true);
    setRemoveError(null);

    try {
      const response = await authenticatedFetch(
        `/api/v1/trainer/students/${removingStudent.userId}`,
        { method: "DELETE" },
      );

      if (response.status === 401) {
        throw new UnauthenticatedRequestError();
      }

      if (!response.ok) {
        setRemoveError(
          await readApiErrorMessage(response, "Não foi possível remover esse aluno."),
        );
        setIsRemoving(false);
        return;
      }

      await response.json();

      setStudents((current) => current.filter((s) => s.userId !== removingStudent.userId));
      setRemovingStudent(null);
    } catch (error: unknown) {
      setRemoveError(
        error instanceof UnauthenticatedRequestError
          ? "Sua sessão expirou. Entre novamente."
          : "Não foi possível remover esse aluno.",
      );
    } finally {
      setIsRemoving(false);
    }
  }

  const activeCount = students.filter((s) => s.status === "active").length;
  const pendingCount = students.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alunos"
        description="Gerencie os alunos conectados ao seu espaço no Move."
      />

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Total"
          value={isLoadingStudents ? "..." : `${students.length}`}
          icon={Users}
        />
        <MetricCard
          label="Ativos"
          value={isLoadingStudents ? "..." : `${activeCount}`}
          icon={UserCheck}
        />
        <MetricCard
          label="Pendentes"
          value={isLoadingStudents ? "..." : `${pendingCount}`}
          icon={Clock}
        />
      </div>

      {/* Setup: convite + adicionar aluno */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InviteLinkCard inviteSlug={null} />
        <AddStudentForm onStudentAdded={handleStudentAdded} />
      </div>

      {/* Lista de alunos — busca, filtros e ordenação */}
      <StudentList
        students={students}
        isLoading={isLoadingStudents}
        errorMessage={listErrorMessage}
        onRetry={() => void handleRetry()}
        onRequestRemove={(student) => {
          setRemoveError(null);
          setRemovingStudent(student);
        }}
      />

      {removingStudent && (
        <ConfirmActionModal
          title="Remover aluno"
          confirmLabel="Remover aluno"
          isLoading={isRemoving}
          errorMessage={removeError}
          onConfirm={() => void handleConfirmRemove()}
          onClose={() => {
            if (!isRemoving) {
              setRemovingStudent(null);
              setRemoveError(null);
            }
          }}
          description={
            <>
              <p>
                Ao remover{" "}
                <strong className="text-foreground">{removingStudent.fullName}</strong>, ele deixa
                de receber novos treinos e perde o acesso à sua galeria.
              </p>
              <p>O histórico de treinos já registrado é preservado.</p>
              <p>Vocês podem se reconectar depois por um novo convite.</p>
            </>
          }
        />
      )}
    </div>
  );
}
