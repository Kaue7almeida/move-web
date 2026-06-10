"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Camera,
  FileText,
  Lightbulb,
  Loader2,
  Minus,
  Ruler,
  Sparkles,
} from "lucide-react";

import type {
  ScanAnalysisResult,
  ScanDetailResponse,
  ScanPhotoOutput,
} from "@/bff/modules/scan/types";
import { ScanApiError, getScan } from "@/services/scan/scanService";
import { saveChatTriggerIntent } from "@/services/chat/chatTriggerService";

import { useAppShell } from "../../AppShellContext";
import { EmptyState, RoleGuard, SectionCard } from "../../app-ui";
import { ScanMetricCard } from "../_components/ScanMetricCard";
import { ScanProgressRing } from "../_components/ScanProgressRing";
import { SCAN_DISCLAIMER } from "../_content";
import { getScanComparison, getScanResultById } from "../_examples/scan-examples";
import type { ScanBand, ScanResult } from "../_types";

const MOCK_SCAN_IDS = new Set(["mock-latest", "mock-previous", "mock-older"]);

function formatScanDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

const QUALITY_CHIP_CLASS: Record<"boa" | "media" | "ruim", string> = {
  boa: "bg-success-soft text-success",
  media: "bg-accent/10 text-accent",
  ruim: "bg-surface-strong text-muted",
};

/* ─── Real → UI shape adapter ───────────────────────────────────────────────── */

function formatDecimal(value: number, digits: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function deriveBodyFatBand(faixa: string): ScanBand {
  const lower = faixa.toLowerCase();
  if (lower.includes("essencial") || lower.includes("atleta") || lower.includes("saud")) {
    return "saudavel";
  }
  if (lower.includes("elevado") || lower.includes("obesidade")) {
    return "atencao";
  }
  return "neutro";
}

function deriveBmiBand(faixa: string): ScanBand {
  const lower = faixa.toLowerCase();
  if (lower.includes("normal")) return "saudavel";
  if (lower.includes("obesidade") || lower.includes("sobrepeso") || lower.includes("abaixo")) {
    return "atencao";
  }
  return "neutro";
}

function deriveWhrBand(faixa: string): ScanBand {
  const lower = faixa.toLowerCase();
  if (lower.includes("normal")) return "saudavel";
  if (lower.includes("risco")) return "atencao";
  return "neutro";
}

function mapPhotosToQualityItems(
  photos: ScanPhotoOutput[],
  qualityOverall: string | null,
): ScanResult["imageQualityItems"] {
  const status: "boa" | "media" | "ruim" =
    qualityOverall === "boa" || qualityOverall === "media" || qualityOverall === "ruim"
      ? qualityOverall
      : "media";
  const statusLabel =
    status === "boa" ? "Boa" : status === "media" ? "Média" : "Ruim";

  return photos.map((photo) => ({
    label: photo.slot === "front" ? "Foto frontal" : "Foto lateral",
    status,
    statusLabel,
  }));
}

/**
 * Adapts a real backend ScanDetailResponse (completed) into the same ScanResult
 * shape used by the existing mock UI. Returns null if `result` is missing the
 * expected analysis payload.
 */
function mapRealToResultUI(detail: ScanDetailResponse): ScanResult | null {
  const scan = detail.scan;

  if (!scan.result || typeof scan.result !== "object" || Array.isArray(scan.result)) {
    return null;
  }

  // The backend persists the AI analysis verbatim in `result`.
  const analysis = scan.result as unknown as ScanAnalysisResult;

  if (!analysis.estimates || !analysis.measurementsCm) {
    return null;
  }

  return {
    id: scan.id,
    previousId: null,
    createdAt: scan.createdAt,
    summary: analysis.observations[0]
      ?? "Resultado da análise de composição corporal a partir das fotos enviadas.",
    bodyFatPercent: analysis.estimates.gorduraPercent,
    bodyFatBand: deriveBodyFatBand(analysis.estimates.faixaGordura),
    bodyFatBandLabel: analysis.estimates.faixaGordura,
    weightKg: scan.weightKg,
    leanMassKg: analysis.estimates.massaMagraKg,
    metrics: [
      {
        key: "lean_mass",
        label: "Massa magra",
        value: formatDecimal(analysis.estimates.massaMagraKg, 1),
        unit: "kg",
        band: "neutro",
        hint: "Inclui músculos, ossos e água.",
      },
      {
        key: "fat_mass",
        label: "Massa gorda",
        value: formatDecimal(analysis.estimates.massaGordaKg, 1),
        unit: "kg",
        band: "neutro",
        hint: "Estimativa a partir do % de gordura.",
      },
      {
        key: "bmi",
        label: "IMC",
        value: formatDecimal(analysis.estimates.imc, 1),
        band: deriveBmiBand(analysis.estimates.faixaImc),
        bandLabel: analysis.estimates.faixaImc,
        hint: "Faixa de referência: 18,5–24,9.",
      },
      {
        key: "bmr",
        label: "TMB",
        value: Math.round(analysis.estimates.tmb).toLocaleString("pt-BR"),
        unit: "kcal",
        band: "neutro",
        hint: "Gasto energético estimado em repouso.",
      },
      {
        key: "whr",
        label: "Cintura-quadril (WHR)",
        value: formatDecimal(analysis.estimates.whr, 2),
        band: deriveWhrBand(analysis.estimates.faixaWhr),
        bandLabel: analysis.estimates.faixaWhr,
        hint: "Proporção entre cintura e quadril.",
      },
    ],
    measurements: [
      { label: "Cintura", value: `${analysis.measurementsCm.cintura} cm` },
      { label: "Quadril", value: `${analysis.measurementsCm.quadril} cm` },
      { label: "Peito", value: `${analysis.measurementsCm.toracicoPeito} cm` },
      { label: "Braço", value: `${analysis.measurementsCm.braco} cm` },
      { label: "Coxa", value: `${analysis.measurementsCm.coxa} cm` },
    ],
    imageQualityOverall: scan.qualityOverall === "boa"
      ? "Boa"
      : scan.qualityOverall === "media"
        ? "Média"
        : scan.qualityOverall === "ruim"
          ? "Ruim"
          : "—",
    imageQualityItems: mapPhotosToQualityItems(detail.photos, scan.qualityOverall),
    observations: analysis.observations,
    insights: [],
  };
}

/* ─── States ────────────────────────────────────────────────────────────────── */

type ComparisonData = {
  previousCreatedAt: string;
  bodyFatPercentDelta: number | null;
  weightKgDelta: number | null;
  leanMassKgDelta: number | null;
};

function ComparisonChip({ label, value, unit }: { label: string; value: number; unit: string }) {
  const abs = Math.abs(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const formatted = value > 0 ? `+${abs}` : value < 0 ? `−${abs}` : abs;
  const Icon = value < 0 ? ArrowDownRight : value > 0 ? ArrowUpRight : Minus;

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1.5">
      <Icon size={13} className="shrink-0 text-muted" />
      <span className="text-[11px] text-muted">{label}</span>
      <span className="text-xs font-semibold text-foreground">{formatted} {unit}</span>
    </div>
  );
}

function BackToScan() {
  return (
    <Link
      href="/app/scan"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
    >
      <ArrowLeft size={14} />
      Voltar para o Scan
    </Link>
  );
}

/* ─── Contextual chat trigger (Task 10c) — front-only, only opaque scanId ─── */
function ScanUnderstandTrigger({ scanId }: { scanId: string }) {
  const router = useRouter();

  function handleClick() {
    // Only the opaque scanId travels — no bodyFat/leanMass/measures/photos/JSON.
    // The backend resolves "scan_understand_result", validates ownership and
    // builds the hidden enriched prompt from the real scan result.
    saveChatTriggerIntent({
      id: "scan_understand_result",
      target: "move_ai",
      visibleMessage: "Me ajude a entender meu resultado do Scan.",
      title: "Entender resultado do Scan",
      contextModule: "scan",
      contextLabel: "Resultado do Scan",
      sourceRoute: "/app/scan",
      entityId: scanId,
      autoSend: true,
      contextTrigger: {
        id: "scan_understand_result",
        entityId: scanId,
      },
    });
    router.push("/app/chat");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full flex-col items-center gap-0.5 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 transition-colors hover:bg-accent-muted"
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-accent">
        <Sparkles size={16} strokeWidth={1.8} />
        Entender meu resultado
      </span>
      <span className="text-[11px] font-normal text-accent/70">
        A IA Move explica seus números
      </span>
    </button>
  );
}

function ResultBody({
  result,
  comparison,
  scanId,
  isExample = false,
}: {
  result: ScanResult;
  comparison: ComparisonData | null;
  scanId: string;
  isExample?: boolean;
}) {
  return (
    <div className="space-y-6">
      {isExample && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              Exemplo ilustrativo — este não é o seu resultado
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800/80 dark:text-amber-400/80">
              Use esta tela apenas para conhecer como o resultado do MoveScan será apresentado.
            </p>
          </div>
        </div>
      )}
      <div>
        <BackToScan />
        <div className="mt-3 flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Análise corporal
          </h1>
          <span className="inline-flex items-center rounded-full bg-accent/8 px-2 py-0.5 text-[10px] font-semibold text-accent">
            Estimativa
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted">{formatScanDate(result.createdAt)}</p>
      </div>

      <section className="card-themed flex flex-col items-center rounded-2xl border border-border bg-surface p-6 text-center">
        <ScanProgressRing
          value={result.bodyFatPercent}
          display={`${result.bodyFatPercent.toLocaleString("pt-BR")}%`}
          caption="Gordura"
        />
        <span className="mt-4 inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-semibold text-success">
          {result.bodyFatBandLabel}
        </span>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{result.summary}</p>
      </section>

      <ScanUnderstandTrigger scanId={scanId} />

      {comparison && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Comparação com a análise anterior
          </h2>
          <SectionCard>
            <p className="text-xs text-muted">
              Em relação a {formatScanDate(comparison.previousCreatedAt)}:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {comparison.bodyFatPercentDelta !== null && (
                <ComparisonChip label="Gordura corporal" value={comparison.bodyFatPercentDelta} unit="p.p." />
              )}
              {comparison.weightKgDelta !== null && (
                <ComparisonChip label="Peso" value={comparison.weightKgDelta} unit="kg" />
              )}
              {comparison.leanMassKgDelta !== null && (
                <ComparisonChip label="Massa magra" value={comparison.leanMassKgDelta} unit="kg" />
              )}
            </div>
          </SectionCard>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Composição</h2>
        <div className="grid grid-cols-2 gap-3">
          {result.metrics.map((metric) => (
            <ScanMetricCard
              key={metric.key}
              label={metric.label}
              value={metric.value}
              unit={metric.unit}
              band={metric.band}
              bandLabel={metric.bandLabel}
              hint={metric.hint}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Medidas</h2>
        <SectionCard>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-muted text-accent">
              <Ruler size={18} strokeWidth={1.8} />
            </div>
            <p className="text-sm font-semibold text-foreground">Medidas estimadas</p>
          </div>
          <div className="mt-3 divide-y divide-border">
            {result.measurements.map((measurement) => (
              <div key={measurement.label} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted">{measurement.label}</span>
                <span className="text-sm font-semibold text-foreground">{measurement.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Qualidade das imagens
        </h2>
        <SectionCard>
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground">Qualidade geral</p>
            <span className="text-sm font-semibold text-foreground">{result.imageQualityOverall}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.imageQualityItems.map((item) => (
              <span
                key={item.label}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${QUALITY_CHIP_CLASS[item.status]}`}
              >
                {item.label}: {item.statusLabel}
              </span>
            ))}
          </div>
        </SectionCard>
      </section>

      {result.observations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Observações</h2>
          <SectionCard>
            <ul className="space-y-2">
              {result.observations.map((observation) => (
                <li key={observation} className="flex items-start gap-2 text-sm leading-relaxed text-muted">
                  <FileText size={14} className="mt-0.5 shrink-0 text-accent" />
                  {observation}
                </li>
              ))}
            </ul>
          </SectionCard>
        </section>
      )}

      {result.insights.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Dicas para você</h2>
          <div className="space-y-2">
            {result.insights.map((insight) => (
              <div
                key={insight.title}
                className="card-themed flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/8 text-accent">
                  <Lightbulb size={16} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <Link
          href="/app/scan/novo"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover active:scale-[0.98] sm:w-auto sm:px-6"
        >
          <Sparkles size={16} />
          Fazer nova análise
        </Link>
        <p className="text-[11px] leading-relaxed text-muted">{SCAN_DISCLAIMER}</p>
      </section>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <BackToScan />
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <Loader2 size={28} className="animate-spin text-accent" />
        <p className="text-sm font-semibold text-foreground">Carregando análise...</p>
      </div>
    </div>
  );
}

function ProcessingState() {
  return (
    <div className="space-y-5">
      <BackToScan />
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <Loader2 size={28} className="animate-spin text-accent" />
        <p className="text-sm font-semibold text-foreground">Sua análise ainda está em andamento.</p>
        <p className="max-w-xs text-xs text-muted">
          Atualize a página em alguns instantes para ver o resultado.
        </p>
      </div>
    </div>
  );
}

function RejectedFailedState({ status, reason }: { status: "rejected" | "failed"; reason: string | null }) {
  const isRejected = status === "rejected";
  const title = isRejected ? "Vamos refazer as fotos" : "Não foi possível concluir a análise";
  const description = isRejected
    ? "As fotos enviadas não permitem uma estimativa confiável. Refaça seguindo as orientações de preparação."
    : reason === "scan_ai_quota_exceeded"
      ? "O serviço de análise está temporariamente indisponível. Tente novamente em alguns minutos."
      : "Algo deu errado ao gerar sua análise. Tente novamente.";

  return (
    <div className="space-y-5">
      <BackToScan />
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          {isRejected ? <Camera size={26} /> : <AlertCircle size={26} />}
        </div>
        <h2 className="mt-4 text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
        <Link
          href="/app/scan/novo"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
        >
          <Sparkles size={16} />
          Fazer nova análise
        </Link>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="space-y-5">
      <BackToScan />
      <EmptyState
        icon={AlertCircle}
        title="Não foi possível carregar"
        description={message}
        action={{ label: "Fazer nova análise", href: "/app/scan/novo" }}
      />
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function ScanResultPage() {
  const { me } = useAppShell();
  const params = useParams<{ scanId: string }>();
  const scanId = params.scanId;
  const isMockScan = MOCK_SCAN_IDS.has(scanId);

  const [realDetail, setRealDetail] = useState<ScanDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(!isMockScan);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isMockScan) {
      return;
    }

    let cancelled = false;

    getScan(scanId)
      .then((data) => {
        if (cancelled) return;
        setRealDetail(data);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ScanApiError && error.status === 404) {
          setErrorMessage("Esta análise não está disponível.");
        } else {
          setErrorMessage(
            error instanceof ScanApiError
              ? error.message
              : "Não foi possível carregar a análise.",
          );
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isMockScan, scanId]);

  if (!me.isStudent) {
    return (
      <RoleGuard
        title="Scan corporal"
        description="O Scan corporal faz parte do espaço do aluno no Move."
      />
    );
  }

  if (isMockScan) {
    const mockResult = getScanResultById(scanId);

    if (!mockResult) {
      return (
        <div className="space-y-5">
          <BackToScan />
          <EmptyState
            icon={FileText}
            title="Análise não encontrada"
            description="Esta análise não está disponível. Faça uma nova análise para ver seu resultado."
            action={{ label: "Fazer análise", href: "/app/scan/novo" }}
          />
        </div>
      );
    }

    return (
      <ResultBody
        result={mockResult}
        comparison={getScanComparison(mockResult.id) ?? null}
        scanId={scanId}
        isExample
      />
    );
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} />;
  }

  if (!realDetail) {
    return <ErrorState message="Resultado indisponível." />;
  }

  const status = realDetail.scan.status;

  if (status === "draft" || status === "processing") {
    return <ProcessingState />;
  }

  if (status === "rejected" || status === "failed") {
    return <RejectedFailedState status={status} reason={realDetail.scan.failureReason} />;
  }

  // completed
  const mapped = mapRealToResultUI(realDetail);

  if (!mapped) {
    return <ErrorState message="Resultado disponível, mas os detalhes estão incompletos." />;
  }

  return <ResultBody result={mapped} comparison={realDetail.comparison} scanId={scanId} />;
}
