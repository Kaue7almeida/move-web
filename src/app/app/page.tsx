"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Users, Dumbbell, FolderOpen, User, BarChart3, ArrowRight, Check, CheckCircle2, Loader2, ScanLine } from "lucide-react";

import type { StudentHomeSummary, StudentWorkoutSummary } from "@/bff/modules/workouts/types";
import { authenticatedFetch } from "@/services/api/authenticatedFetch";

import { useAppShell } from "./AppShellContext";
import {
  PageHeader,
  MetricCard,
  StepperChecklist,
  QuickAction,
} from "./app-ui";
import {
  buildStudentChecklist,
  buildTrainerChecklist,
  getRelationshipSummary,
  type ChecklistSummary,
} from "./app-utils";

/* ─── Greeting ─── */
function Greeting({
  name,
  subtitle,
}: {
  name: string;
  subtitle: string;
}) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <PageHeader
      title={`${greeting}, ${name}`}
      description={subtitle}
    />
  );
}

/* ─── Trainer Home ─── */
function TrainerHome() {
  const { me, greetingName } = useAppShell();
  const checklist = buildTrainerChecklist(me);
  const stats = getRelationshipSummary(me);
  const allDone = checklist.completedCount === checklist.totalCount;

  return (
    <div className="space-y-8">
      <Greeting
        name={greetingName}
        subtitle={
          allDone
            ? "Tudo configurado. Seu espaço está pronto."
            : "Continue configurando seu espaço no Move."
        }
      />

      {/* Metrics strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Alunos"
          value={`${stats.startedCount}`}
          icon={Users}
        />
        <MetricCard
          label="Ativos"
          value={`${stats.activeCount}`}
          icon={Users}
        />
        <MetricCard
          label="Pendentes"
          value={`${stats.pendingCount}`}
          icon={Users}
        />
        <MetricCard
          label="Treinos"
          value="--"
          detail="Em breve"
          icon={Dumbbell}
        />
      </div>

      {/* Two-column layout: checklist + quick actions */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Stepper checklist */}
        {!allDone && <StepperChecklist summary={checklist} />}

        {/* Quick actions */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
            Acesso rápido
          </h3>
          <QuickAction
            href="/app/alunos"
            label="Gerenciar alunos"
            description="Adicione alunos ou veja os que já estão conectados"
            icon={Users}
          />
          <QuickAction
            href="/app/treinos"
            label="Treinos"
            description="Crie e organize os treinos dos seus alunos"
            icon={Dumbbell}
          />
          <QuickAction
            href="/app/galeria"
            label="Galeria"
            description="Salve modelos de treino para reutilizar"
            icon={FolderOpen}
          />
          <QuickAction
            href="/app/perfil"
            label="Meu perfil"
            description="Revise suas informações profissionais"
            icon={User}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Student daily home (post-activation) ─── */

function pickPrimaryActiveWorkout(
  workouts: StudentWorkoutSummary[],
): StudentWorkoutSummary | null {
  const active = workouts.filter((workout) => workout.status === "active");

  if (active.length === 0) {
    return null;
  }

  // Most recently activated wins; fall back to assignment time.
  return active
    .slice()
    .sort((left, right) =>
      (right.activatedAt ?? right.assignedAt).localeCompare(left.activatedAt ?? left.assignedAt),
    )[0];
}

/** Display-only: capitalizes the first letter so "treino 1" shows as "Treino 1".
 *  Does not change stored data. */
function formatDisplayTitle(title: string): string {
  const trimmed = title.trim();

  if (trimmed === "") {
    return trimmed;
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function WorkoutHero({
  isLoading,
  primaryWorkout,
  hasPending,
  activeWorkoutCount,
}: {
  isLoading: boolean;
  primaryWorkout: StudentWorkoutSummary | null;
  hasPending: boolean;
  activeWorkoutCount: number;
}) {
  const otherActiveCount = Math.max(0, activeWorkoutCount - 1);
  return (
    <section className="card-themed rounded-xl border border-border bg-surface p-5 sm:p-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
        Pronto para treinar
      </p>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" />
          Carregando seu treino...
        </div>
      ) : primaryWorkout ? (
        <>
          <div className="mt-2 flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {formatDisplayTitle(primaryWorkout.title)}
            </h2>
            <span className="mt-1 inline-flex shrink-0 items-center rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-semibold text-success">
              Ativo
            </span>
          </div>
          <p className="mt-1.5 text-sm text-muted">
            {primaryWorkout.exerciseCount} exercício{primaryWorkout.exerciseCount !== 1 ? "s" : ""}
          </p>
          {primaryWorkout.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {primaryWorkout.description}
            </p>
          )}
          <Link
            href="/app/treinos"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
          >
            Ver treino
            <ArrowRight size={16} />
          </Link>
          {otherActiveCount > 0 && (
            <p className="mt-3 text-xs text-muted">
              +{otherActiveCount} treino{otherActiveCount !== 1 ? "s" : ""} disponíve{otherActiveCount !== 1 ? "is" : "l"} na sua área.
            </p>
          )}
        </>
      ) : hasPending ? (
        <>
          <h2 className="mt-2 text-lg font-semibold text-foreground">
            Seu personal está preparando seu treino
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Assim que ele ativar, seu treino aparece aqui pronto para começar.
          </p>
          <Link
            href="/app/treinos"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-strong px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            Ver treinos
            <ArrowRight size={14} />
          </Link>
        </>
      ) : (
        <>
          <h2 className="mt-2 text-lg font-semibold text-foreground">
            Nenhum treino ativo no momento
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Fale com seu personal para receber seu próximo treino.
          </p>
          <Link
            href="/app/treinos"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-strong px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            Ver treinos
            <ArrowRight size={14} />
          </Link>
        </>
      )}
    </section>
  );
}

function ActivationSummaryCard({ checklist }: { checklist: ChecklistSummary }) {
  return (
    <section className="card-themed rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-success" />
            <h3 className="text-sm font-semibold text-foreground">Ativação concluída</h3>
          </div>
          <p className="mt-1 text-xs text-muted">Seu espaço está pronto para treinar.</p>
        </div>
        <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-semibold text-success">
          {checklist.completedCount}/{checklist.totalCount}
        </span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {checklist.items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Check size={13} className="text-success" strokeWidth={2.5} />
            {item.title}
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatShortDate(iso: string | null): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function RecentActivityCard({
  lastCompletedSession,
}: {
  lastCompletedSession: StudentHomeSummary["lastCompletedSession"];
}) {
  return (
    <section className="card-themed rounded-xl border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold text-foreground">Atividade recente</h3>

      {lastCompletedSession ? (
        <div className="mt-3 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
              Último treino concluído
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {lastCompletedSession.title ? formatDisplayTitle(lastCompletedSession.title) : "Treino"}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {[
                formatShortDate(lastCompletedSession.completedAt),
                `${lastCompletedSession.setsCount} série${lastCompletedSession.setsCount !== 1 ? "s" : ""} registrada${lastCompletedSession.setsCount !== 1 ? "s" : ""}`,
              ]
                .filter((part) => part !== "")
                .join(" · ")}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Você ainda não concluiu nenhum treino. Conclua seu primeiro treino para começar seu histórico.
        </p>
      )}
    </section>
  );
}

function StudentDailyHome({
  checklist,
  completedSessionCount,
}: {
  checklist: ChecklistSummary;
  completedSessionCount: number;
}) {
  const [summary, setSummary] = useState<StudentHomeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      try {
        const response = await authenticatedFetch("/api/v1/student/home-summary", { method: "GET" });

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as StudentHomeSummary;

        if (isMounted) {
          setSummary(payload);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeWorkoutCount = summary?.activeWorkoutCount ?? 0;
  const sessionsLast7Days = summary?.sessionsLast7Days ?? 0;
  const totalCompletedSessions = summary?.completedSessionCount ?? completedSessionCount;
  const primaryWorkout = pickPrimaryActiveWorkout(summary?.activeWorkouts ?? []);
  const hasPending = (summary?.pendingWorkoutCount ?? 0) > 0;

  return (
    <div className="space-y-8">
      {/* Real metrics — no placeholders */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MetricCard
          label="Treinos ativos"
          value={isLoading ? "..." : `${activeWorkoutCount}`}
          icon={Dumbbell}
        />
        <MetricCard
          label="Últimos 7 dias"
          value={isLoading ? "..." : `${sessionsLast7Days}`}
          detail={sessionsLast7Days === 1 ? "sessão" : "sessões"}
          icon={BarChart3}
        />
        <MetricCard
          label="Sessões"
          value={`${totalCompletedSessions}`}
          detail={totalCompletedSessions === 1 ? "concluída" : "concluídas"}
          icon={CheckCircle2}
        />
      </div>

      {/* Hero + quick actions — no empty column */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <WorkoutHero
          isLoading={isLoading}
          primaryWorkout={primaryWorkout}
          hasPending={hasPending}
          activeWorkoutCount={activeWorkoutCount}
        />

        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
            Acesso rápido
          </h3>
          <QuickAction
            href="/app/treinos"
            label="Meus treinos"
            description="Veja e inicie seus treinos"
            icon={Dumbbell}
          />
          <QuickAction
            href="/app/perfil"
            label="Meu perfil"
            description="Revise seus dados e preferências"
            icon={User}
          />
        </div>
      </div>

      {/* Scan corporal — módulo em destaque */}
      <Link
        href="/app/scan"
        className="card-themed group flex items-center gap-4 rounded-2xl border border-accent/30 bg-surface p-5 ring-1 ring-accent/10 transition-colors hover:bg-surface-hover"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-on">
          <ScanLine size={24} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">Scan corporal</p>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
              Novo
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Estime sua composição corporal por foto, sem balança de bioimpedância.
          </p>
        </div>
        <ArrowRight
          size={18}
          className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5"
        />
      </Link>

      {/* Recent activity — real data only */}
      <RecentActivityCard lastCompletedSession={summary?.lastCompletedSession ?? null} />

      <ActivationSummaryCard checklist={checklist} />
    </div>
  );
}

/* ─── Student Home ─── */
function StudentHome() {
  const { me, greetingName, displayName } = useAppShell();
  const checklist = buildStudentChecklist(me);
  const stats = getRelationshipSummary(me);
  const allDone = checklist.completedCount === checklist.totalCount;

  // ── Daily home (activation checklist complete) ──
  if (allDone) {
    return (
      <div className="space-y-8">
        <Greeting
          name={greetingName}
          subtitle="Seu espaço está pronto para treinar."
        />
        <StudentDailyHome
          checklist={checklist}
          completedSessionCount={me.studentStats?.completedSessionCount ?? 0}
        />
      </div>
    );
  }

  // ── Activation home (checklist in progress) — preserved as-is ──
  return (
    <div className="space-y-8">
      <Greeting
        name={greetingName}
        subtitle="Complete seu perfil para aproveitar melhor o Move."
      />

      {/* Metrics strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Perfil"
          value={displayName ?? "Pendente"}
          icon={User}
        />
        <MetricCard
          label="Personal"
          value={
            stats.activeCount === 0
              ? "Aguardando"
              : stats.activeCount === 1
                ? "1 profissional conectado"
                : `${stats.activeCount} profissionais conectados`
          }
          icon={Users}
        />
        <MetricCard
          label="Treinos"
          value="--"
          detail="Em breve"
          icon={Dumbbell}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <StepperChecklist summary={checklist} />

        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
            Acesso rápido
          </h3>
          <QuickAction
            href="/app/treinos"
            label="Treinos"
            description="Seus treinos vão aparecer aqui"
            icon={Dumbbell}
          />
          <QuickAction
            href="/app/historico"
            label="Histórico"
            description="Acompanhe seus registros de treino"
            icon={BarChart3}
          />
          <QuickAction
            href="/app/perfil"
            label="Meu perfil"
            description="Revise seus dados e preferências"
            icon={User}
          />
        </div>
      </div>
    </div>
  );
}

export default function AppHomePage() {
  const { isTrainer, refreshMe } = useAppShell();

  // Refresh the cached profile on each visit so the checklist reflects workouts
  // and sessions created elsewhere (e.g. after completing a guided execution).
  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  return isTrainer ? <TrainerHome /> : <StudentHome />;
}
