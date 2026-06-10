"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  ChevronRight,
  Hourglass,
  Loader2,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import type {
  ScanAnalysisResult,
  ScanDetailResponse,
  ScanEligibility,
  ScanSummaryItem,
} from "@/bff/modules/scan/types";
import { ScanApiError, getScan, listScans } from "@/services/scan/scanService";

import { useAppShell } from "../AppShellContext";
import { PageHeader, RoleGuard, SectionCard } from "../app-ui";
import { ScanProgressRing } from "./_components/ScanProgressRing";
import { SCAN_DISCLAIMER, SCAN_DISCOVER, SCAN_HOW_IT_WORKS } from "./_content";

const RECOMMENDED_INTERVAL_DAYS = 30;

// Reference "today" captured once at module load (deterministic in render).
const REFERENCE_DATE = new Date();

function formatScanDate(iso: string): string {
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

function formatQualityLabel(qualityOverall: string | null): string {
  if (qualityOverall === "boa") return "Boa";
  if (qualityOverall === "media") return "Média";
  if (qualityOverall === "ruim") return "Ruim";
  return "—";
}

function readBodyFatBandLabel(detail: ScanDetailResponse | null): string | null {
  if (!detail?.scan.result || typeof detail.scan.result !== "object") {
    return null;
  }
  const analysis = detail.scan.result as unknown as ScanAnalysisResult;
  return analysis.estimates?.faixaGordura ?? null;
}

function daysSinceIso(iso: string): number {
  const from = new Date(iso);
  if (Number.isNaN(from.getTime())) {
    return Number.POSITIVE_INFINITY;
  }
  const diffMs = REFERENCE_DATE.getTime() - from.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function formatDaysCount(count: number): string {
  return `${count} dia${count === 1 ? "" : "s"}`;
}

/* ─── Scenario engine ───────────────────────────────────────────────────────── */

type ScanHubScenario =
  | { kind: "empty" }
  | { kind: "processing"; scan: ScanSummaryItem }
  | { kind: "rejected"; scan: ScanSummaryItem }
  | { kind: "failed"; scan: ScanSummaryItem }
  | { kind: "completed_recent"; scan: ScanSummaryItem; ageDays: number; history: ScanSummaryItem[] }
  | { kind: "completed_overdue"; scan: ScanSummaryItem; ageDays: number; history: ScanSummaryItem[] }
  | { kind: "draft"; scan: ScanSummaryItem };

function pickScenario(items: ScanSummaryItem[]): ScanHubScenario {
  if (items.length === 0) {
    return { kind: "empty" };
  }

  // 1) Processing wins over anything else
  const processing = items.find((item) => item.status === "processing");
  if (processing) {
    return { kind: "processing", scan: processing };
  }

  // Items are newest-first per backend ordering.
  const latest = items[0];
  const completedItems = items.filter(
    (item) => item.status === "completed" && item.bodyFatPercent !== null,
  );
  const latestCompleted = completedItems[0] ?? null;

  // 2) Most recent attempt was rejected/failed, with no newer completed
  if (latest && (latest.status === "rejected" || latest.status === "failed")) {
    const completedIsNewer = latestCompleted
      ? latestCompleted.createdAt > latest.createdAt
      : false;

    if (!completedIsNewer) {
      return latest.status === "rejected"
        ? { kind: "rejected", scan: latest }
        : { kind: "failed", scan: latest };
    }
  }

  // 3 + 4) Completed: recent or overdue
  if (latestCompleted) {
    const ageDays = daysSinceIso(latestCompleted.createdAt);
    return {
      kind: ageDays < RECOMMENDED_INTERVAL_DAYS ? "completed_recent" : "completed_overdue",
      scan: latestCompleted,
      ageDays,
      history: completedItems,
    };
  }

  // 5) Draft exists but no completed history
  const draft = items.find((item) => item.status === "draft");
  if (draft) {
    return { kind: "draft", scan: draft };
  }

  // 6) Fallback: treat as empty
  return { kind: "empty" };
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function ScanHubPage() {
  const { me } = useAppShell();

  const [items, setItems] = useState<ScanSummaryItem[]>([]);
  const [eligibility, setEligibility] = useState<ScanEligibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestDetail, setLatestDetail] = useState<ScanDetailResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    listScans()
      .then((response) => {
        if (cancelled) return;
        setItems(response.items);
        setEligibility(response.eligibility);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(
          error instanceof ScanApiError
            ? error.message
            : "Não foi possível carregar suas análises.",
        );
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const scenario = pickScenario(items);

  // Detail (faixa label) is only needed for completed_* scenarios.
  const detailScanId =
    scenario.kind === "completed_recent" || scenario.kind === "completed_overdue"
      ? scenario.scan.id
      : null;

  useEffect(() => {
    if (!detailScanId) {
      return;
    }
    let cancelled = false;
    getScan(detailScanId)
      .then((data) => {
        if (cancelled) return;
        setLatestDetail(data);
      })
      .catch(() => {
        // Non-fatal: hero renders without faixa label.
      });
    return () => {
      cancelled = true;
    };
  }, [detailScanId]);

  if (!me.isStudent) {
    return (
      <RoleGuard
        title="Scan corporal"
        description="O Scan corporal faz parte do espaço do aluno no Move."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Scan corporal" description="Carregando suas análises..." />
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
          <Loader2 size={24} className="animate-spin text-accent" />
          <p className="text-xs text-muted">Buscando suas análises...</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-6">
        <PageHeader title="Scan corporal" description="Houve um problema ao carregar." />
        <div className="rounded-xl border border-dashed border-border bg-surface/50 px-4 py-5 text-center">
          <p className="text-sm text-red-500">{errorMessage}</p>
          <Link
            href="/app/scan/novo"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Fazer nova análise
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan corporal"
        description={describeHubByScenario(scenario.kind)}
      />

      {/* ── Hero por cenário ── */}

      {scenario.kind === "processing" && <ProcessingHero scan={scenario.scan} />}

      {scenario.kind === "rejected" && <RejectedHero scan={scenario.scan} />}

      {scenario.kind === "failed" && <FailedHero scan={scenario.scan} />}

      {scenario.kind === "draft" && <DraftHero scan={scenario.scan} />}

      {scenario.kind === "completed_recent" && (
        <CompletedRecentHero
          scan={scenario.scan}
          ageDays={scenario.ageDays}
          bandLabel={readBodyFatBandLabel(latestDetail)}
          eligibility={eligibility}
        />
      )}

      {scenario.kind === "completed_overdue" && (
        <CompletedOverdueHero
          scan={scenario.scan}
          ageDays={scenario.ageDays}
          bandLabel={readBodyFatBandLabel(latestDetail)}
        />
      )}

      {scenario.kind === "empty" && <EmptyHero />}

      {/* ── Timeline ── (only when there's real completed history) */}

      {(scenario.kind === "completed_recent" || scenario.kind === "completed_overdue")
        && scenario.history.length > 0 && (
        <HistorySection items={scenario.history} />
      )}

      {/* ── Onboarding extras (only empty) ── */}

      {scenario.kind === "empty" && (
        <>
          <HowItWorksSection />
          <WhatYouDiscoverSection />
          <ExampleResultHint />
        </>
      )}

      <p className="text-[11px] leading-relaxed text-muted">{SCAN_DISCLAIMER}</p>
    </div>
  );
}

/* ─── Page header copy ──────────────────────────────────────────────────────── */

function describeHubByScenario(kind: ScanHubScenario["kind"]): string {
  switch (kind) {
    case "empty":
      return "Estime sua composição corporal por foto.";
    case "processing":
      return "Sua análise está em andamento.";
    case "rejected":
      return "Vamos refazer suas fotos.";
    case "failed":
      return "Algo deu errado na sua última análise.";
    case "draft":
      return "Você tem uma análise iniciada.";
    case "completed_recent":
      return "Sua composição corporal mais recente.";
    case "completed_overdue":
      return "Está na hora de atualizar sua análise.";
  }
}

/* ─── Cenário 1: Empty ──────────────────────────────────────────────────────── */

function EmptyHero() {
  return (
    <section className="card-themed rounded-2xl border border-accent/30 bg-surface p-5 ring-1 ring-accent/10 sm:p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-on">
        <ScanLine size={22} strokeWidth={1.8} />
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
        Move Scan
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        Conheça sua composição corporal
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        O Move Scan usa duas fotos para estimar gordura corporal, massa magra e medidas, sem
        balança de bioimpedância.
      </p>

      <Link
        href="/app/scan/novo"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover active:scale-[0.98] sm:w-auto sm:px-6"
      >
        Fazer primeira análise
        <ArrowRight size={16} />
      </Link>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted">Como funciona</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {SCAN_HOW_IT_WORKS.map((step, index) => (
          <SectionCard key={step.title}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-muted text-accent">
                <step.icon size={18} strokeWidth={1.8} />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Passo {index + 1}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">{step.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{step.description}</p>
          </SectionCard>
        ))}
      </div>
    </section>
  );
}

function WhatYouDiscoverSection() {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
        O que você descobre
      </h3>
      <SectionCard>
        <div className="grid gap-3 sm:grid-cols-2">
          {SCAN_DISCOVER.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/8 text-accent">
                <item.icon size={16} strokeWidth={1.8} />
              </div>
              <p className="text-sm text-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </section>
  );
}

function ExampleResultHint() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-border bg-surface/50 px-4 py-4">
      <ShieldCheck size={16} className="mt-0.5 shrink-0 text-muted" />
      <div className="min-w-0">
        <p className="text-xs leading-relaxed text-muted">
          Quer ver como fica o resultado antes de tirar suas fotos?
        </p>
        <Link
          href="/app/scan/mock-latest"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent-hover"
        >
          Ver exemplo ilustrativo de resultado
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

/* ─── Cenário 2: Processing ─────────────────────────────────────────────────── */

function ProcessingHero({ scan }: { scan: ScanSummaryItem }) {
  return (
    <section className="card-themed rounded-2xl border border-accent/30 bg-surface p-6 ring-1 ring-accent/10">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Hourglass size={22} strokeWidth={1.8} />
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
        Em andamento
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
        Sua análise está em andamento
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Estamos processando suas fotos. Isso pode levar alguns segundos.
      </p>

      <Link
        href={`/app/scan/${scan.id}`}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover sm:w-auto sm:px-6"
      >
        Ver análise
        <ArrowRight size={16} />
      </Link>
    </section>
  );
}

/* ─── Cenário 3: Draft ──────────────────────────────────────────────────────── */

function DraftHero({ scan }: { scan: ScanSummaryItem }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
        Análise iniciada
      </p>
      <h2 className="mt-1 text-base font-semibold text-foreground">
        Você tem uma análise iniciada
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Iniciada em {formatScanDate(scan.createdAt)}. Retomar análises iniciadas estará
        disponível em breve — por enquanto, comece uma nova.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/app/scan/novo"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover active:scale-[0.98]"
        >
          Fazer nova análise
          <ArrowRight size={16} />
        </Link>
        <Link
          href={`/app/scan/${scan.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-strong px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          Ver análise iniciada
        </Link>
      </div>
    </section>
  );
}

/* ─── Cenário 4: Completed recente ──────────────────────────────────────────── */

function CompletedRecentHero({
  scan,
  ageDays,
  bandLabel,
  eligibility,
}: {
  scan: ScanSummaryItem;
  ageDays: number;
  bandLabel: string | null;
  eligibility: ScanEligibility | null;
}) {
  const bodyFatPercent = scan.bodyFatPercent ?? 0;
  const daysUntilNext = eligibility?.daysUntilNext ?? Math.max(0, RECOMMENDED_INTERVAL_DAYS - ageDays);
  const isBlocked = eligibility?.isBlocked ?? false;
  const canUseBonus = eligibility?.canUseBonus ?? false;

  return (
    <section className="card-themed rounded-2xl border border-accent/30 bg-surface p-6 ring-1 ring-accent/10">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
          Última análise
        </p>
        <span className="text-xs text-muted">{formatScanDate(scan.createdAt)}</span>
      </div>

      <div className="mt-4 flex flex-col items-center text-center">
        <ScanProgressRing
          value={bodyFatPercent}
          display={`${bodyFatPercent.toLocaleString("pt-BR")}%`}
          caption="Gordura"
        />
        {bandLabel && (
          <span className="mt-3 inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-semibold text-success">
            {bandLabel}
          </span>
        )}
      </div>

      {isBlocked ? (
        <p className="mt-4 text-center text-xs text-muted">
          Você já usou suas análises deste período. Nova análise disponível em {formatDaysCount(daysUntilNext)}.
        </p>
      ) : (
        <p className="mt-4 text-center text-xs text-muted">
          Próxima análise recomendada em {formatDaysCount(daysUntilNext)}.
        </p>
      )}

      {isBlocked ? (
        <div className="mt-5">
          <Link
            href={`/app/scan/${scan.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover active:scale-[0.98]"
          >
            Ver resultado
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : canUseBonus ? (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/app/scan/novo?bonus=1"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover active:scale-[0.98]"
          >
            <Sparkles size={16} />
            Usar análise extra grátis
          </Link>
          <Link
            href={`/app/scan/${scan.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-strong px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            Ver último resultado
          </Link>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/app/scan/${scan.id}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover active:scale-[0.98]"
          >
            Ver resultado
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/app/scan/novo"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-strong px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            Fazer nova análise mesmo assim
          </Link>
        </div>
      )}
    </section>
  );
}

/* ─── Cenário 5: Completed vencida ──────────────────────────────────────────── */

function CompletedOverdueHero({
  scan,
  ageDays,
  bandLabel,
}: {
  scan: ScanSummaryItem;
  ageDays: number;
  bandLabel: string | null;
}) {
  const bodyFatPercent = scan.bodyFatPercent ?? 0;

  return (
    <section className="card-themed rounded-2xl border border-accent/40 bg-surface p-6 ring-1 ring-accent/15">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-on">
        <RefreshCw size={20} strokeWidth={1.8} />
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
        Hora de atualizar
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
        Está na hora de atualizar sua análise
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Compare sua evolução com a última medição feita há {formatDaysCount(ageDays)}.
      </p>

      {/* Resumo da última */}
      <div className="mt-5 flex items-center gap-4 rounded-xl border border-border bg-background p-4">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-accent/10 text-accent">
          <span className="text-sm font-bold leading-none">
            {bodyFatPercent.toLocaleString("pt-BR")}
          </span>
          <span className="mt-0.5 text-[9px] font-medium leading-none">%GC</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Última análise</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            {formatScanDate(scan.createdAt)}
          </p>
          {bandLabel && <p className="mt-0.5 text-[11px] text-muted">{bandLabel}</p>}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/app/scan/novo"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover active:scale-[0.98]"
        >
          Fazer nova análise
          <ArrowRight size={16} />
        </Link>
        <Link
          href={`/app/scan/${scan.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-strong px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          Ver último resultado
        </Link>
      </div>
    </section>
  );
}

/* ─── Cenário 6: Rejected ───────────────────────────────────────────────────── */

function RejectedHero({ scan }: { scan: ScanSummaryItem }) {
  return (
    <section className="rounded-2xl border border-accent/30 bg-accent/5 p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-on">
        <Camera size={20} strokeWidth={1.8} />
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
        Refazer fotos
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
        Precisamos refazer suas fotos
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        As fotos enviadas em {formatScanDate(scan.createdAt)} não permitem uma estimativa confiável.
        Tente novamente seguindo o passo a passo de preparação.
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/app/scan/novo"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover active:scale-[0.98]"
        >
          Refazer análise
          <ArrowRight size={16} />
        </Link>
        <Link
          href={`/app/scan/${scan.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-strong px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          Ver tentativa
        </Link>
      </div>
    </section>
  );
}

/* ─── Cenário 7: Failed ─────────────────────────────────────────────────────── */

function FailedHero({ scan }: { scan: ScanSummaryItem }) {
  return (
    <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
        <AlertCircle size={22} strokeWidth={1.8} />
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-red-500">
        Não concluída
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
        Não conseguimos concluir sua análise
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Pode ter sido uma instabilidade temporária. Tente fazer a análise novamente.
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/app/scan/novo"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover active:scale-[0.98]"
        >
          <Sparkles size={16} />
          Tentar novamente
        </Link>
        <Link
          href={`/app/scan/${scan.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-strong px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          Ver tentativa
        </Link>
      </div>
    </section>
  );
}

/* ─── Cenário 8: Histórico (timeline) ───────────────────────────────────────── */

function HistorySection({ items }: { items: ScanSummaryItem[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
        Análises recentes
      </h2>
      <div className="space-y-2">
        {items.map((item, index) => {
          const bf = item.bodyFatPercent ?? 0;

          return (
            <Link
              key={item.id}
              href={`/app/scan/${item.id}`}
              className="card-themed group flex items-center gap-3.5 rounded-xl border border-border bg-surface px-4 py-3.5 transition-all hover:border-accent/30 hover:bg-surface-hover active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-accent/10 text-accent">
                <span className="text-sm font-bold leading-none">
                  {bf.toLocaleString("pt-BR")}
                </span>
                <span className="mt-0.5 text-[9px] font-medium leading-none">%GC</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {formatScanDate(item.createdAt)}
                  </p>
                  {index === 0 && (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-accent/8 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      Mais recente
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted">
                  {item.weightKg.toLocaleString("pt-BR")} kg · Imagens: {formatQualityLabel(item.qualityOverall)}
                </p>
              </div>
              <ChevronRight
                size={16}
                className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
