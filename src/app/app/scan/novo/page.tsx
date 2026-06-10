"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Lightbulb,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import type { ScanSex, ScanSource } from "@/bff/modules/scan/types";
import {
  ScanApiError,
  createScan,
  processScan,
  uploadScanPhoto,
} from "@/services/scan/scanService";

import { useAppShell } from "../../AppShellContext";
import { PageHeader, RoleGuard, SectionCard } from "../../app-ui";
import { ScanCompareCard } from "../_components/ScanCompareCard";
import { ScanGuideCard } from "../_components/ScanGuideCard";
import { ScanPhotoCapture } from "../_components/ScanPhotoCapture";
import { ScanStepper } from "../_components/ScanStepper";
import {
  SCAN_DISCLAIMER,
  SCAN_PREP_ITEMS,
  SCAN_QUALITY_TIPS,
  SCAN_WIZARD_STEPS,
} from "../_content";

type Anthropometrics = {
  weightKg: string;
  heightCm: string;
  ageYears: string;
  sex: string;
};

const SEX_OPTIONS = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "outro", label: "Outro" },
];

// Reference "today" captured once at module load (not during render) so age
// prefill stays pure in render — no Date.now()/new Date() in the component body.
const REFERENCE_DATE = new Date();
const REFERENCE_PARTS = {
  year: REFERENCE_DATE.getFullYear(),
  month: REFERENCE_DATE.getMonth() + 1,
  day: REFERENCE_DATE.getDate(),
};

function normalizeSex(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized === "feminino" || normalized === "female" || normalized === "f") {
    return "feminino";
  }

  if (normalized === "masculino" || normalized === "male" || normalized === "m") {
    return "masculino";
  }

  return "outro";
}

function computeAgeFromBirthDate(birthDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);

  if (!match) {
    return null;
  }

  const birthYear = Number(match[1]);
  const birthMonth = Number(match[2]);
  const birthDay = Number(match[3]);

  let age = REFERENCE_PARTS.year - birthYear;

  if (
    REFERENCE_PARTS.month < birthMonth
    || (REFERENCE_PARTS.month === birthMonth && REFERENCE_PARTS.day < birthDay)
  ) {
    age -= 1;
  }

  return age >= 0 && age < 130 ? age : null;
}

function computeBmi(weightKg: string, heightCm: string): number | null {
  const weight = Number(weightKg);
  const heightMeters = Number(heightCm) / 100;

  if (
    !Number.isFinite(weight)
    || !Number.isFinite(heightMeters)
    || weight <= 0
    || heightMeters <= 0
  ) {
    return null;
  }

  return Math.round((weight / (heightMeters * heightMeters)) * 10) / 10;
}

/* ─── Quality tips list (shown alongside photo capture) ─── */
function QualityTips() {
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      <div className="flex items-center gap-2">
        <Lightbulb size={14} className="text-accent" />
        <p className="text-xs font-semibold text-foreground">Para uma boa estimativa</p>
      </div>
      <ul className="mt-2 space-y-1.5">
        {SCAN_QUALITY_TIPS.map((tip) => (
          <li key={tip} className="flex items-center gap-2 text-xs text-muted">
            <Check size={13} className="shrink-0 text-success" strokeWidth={2.5} />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Processing phases (real flow) ───────────────────────────────────────── */

type ProcessingPhase =
  | "creating"
  | "uploading_front"
  | "uploading_side"
  | "processing"
  | "error";

const PHASE_LABEL: Record<Exclude<ProcessingPhase, "error">, string> = {
  creating: "Criando sua análise...",
  uploading_front: "Enviando foto frontal...",
  uploading_side: "Enviando foto lateral...",
  processing: "Analisando suas fotos com IA. Isso pode levar alguns segundos.",
};

function getErrorCopyByCode(code: string | undefined): string {
  switch (code) {
    case "scan_cooldown_active":
      return "Você já tem uma análise concluída nos últimos 30 dias.";
    case "scan_limit_reached":
      return "Você já usou suas análises regular e extra deste período.";
    case "scan_image_rejected":
      return "As imagens não foram aceitas. Refaça as fotos seguindo as orientações.";
    case "scan_ai_quota_exceeded":
      return "O serviço de análise está temporariamente indisponível. Tente novamente em alguns minutos.";
    case "scan_storage_failed":
      return "Não foi possível enviar uma das fotos. Verifique sua conexão e tente novamente.";
    case "scan_ai_failed":
    case "scan_ai_invalid_response":
      return "Não foi possível gerar a análise no momento. Tente novamente.";
    case "scan_consent_required":
      return "É preciso aceitar a privacidade antes de processar a análise.";
    case "scan_photos_required":
      return "Envie as fotos frontal e lateral antes de processar.";
    case "scan_already_processing":
      return "Esta análise já está em processamento.";
    case "scan_already_completed":
      return "Esta análise já foi concluída.";
    case "scan_photo_too_large":
      return "Uma das fotos ultrapassa o limite de 15 MB.";
    case "scan_photo_invalid_type":
      return "Formato de imagem não suportado. Use JPEG, PNG ou WEBP.";
    default:
      return "Algo deu errado ao processar sua análise. Tente novamente.";
  }
}

const TOTAL_PREP = SCAN_PREP_ITEMS.length;

/** useSearchParams exige um Suspense boundary no prerender estatico. */
export default function ScanWizardPage() {
  return (
    <Suspense fallback={null}>
      <ScanWizardPageContent />
    </Suspense>
  );
}

function ScanWizardPageContent() {
  const { me } = useAppShell();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBonus = searchParams.get("bonus") === "1";
  const [stepIndex, setStepIndex] = useState(0);
  // Sub-progress inside the "prep" outer step (0 = first of 6)
  const [prepSubIndex, setPrepSubIndex] = useState(0);
  const [consentChecked, setConsentChecked] = useState(false);
  const [anthro, setAnthro] = useState<Anthropometrics>(() => {
    const birthDate = me.studentProfile?.birth_date ?? null;
    const age = birthDate ? computeAgeFromBirthDate(birthDate) : null;

    return {
      weightKg: me.studentProfile?.weight_kg != null ? String(me.studentProfile.weight_kg) : "",
      heightCm: me.studentProfile?.height_cm != null ? String(me.studentProfile.height_cm) : "",
      ageYears: age != null ? String(age) : "",
      sex: normalizeSex(me.studentProfile?.sex),
    };
  });

  // File handles (used for upload) + preview URLs (revoked in cleanup effects).
  // Both are set together in event handlers so cleanup effects never call setState.
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string | null>(null);
  const [sidePreviewUrl, setSidePreviewUrl] = useState<string | null>(null);

  // Real-flow processing state — driven by the "processing" wizard step.
  const [processingPhase, setProcessingPhase] = useState<ProcessingPhase>("creating");
  const [processingError, setProcessingError] = useState<{
    code?: string;
    message: string;
    bonusAvailable?: boolean | null;
  } | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const scanIdRef = useRef<string | null>(null);
  const uploadedFrontRef = useRef(false);
  const uploadedSideRef = useRef(false);
  // Idempotency guard against React StrictMode double-effect and stray re-runs.
  const chainRunningRef = useRef(false);

  useEffect(() => {
    if (!frontPreviewUrl) {
      return;
    }

    return () => URL.revokeObjectURL(frontPreviewUrl);
  }, [frontPreviewUrl]);

  useEffect(() => {
    if (!sidePreviewUrl) {
      return;
    }

    return () => URL.revokeObjectURL(sidePreviewUrl);
  }, [sidePreviewUrl]);

  const stepKeyForEffect = SCAN_WIZARD_STEPS[stepIndex].key;

  // Real cadeia: createScan → upload front → upload side → process → navigate.
  // Refs make each segment skippable on retry so we never re-upload completed parts.
  useEffect(() => {
    if (stepKeyForEffect !== "processing") {
      return;
    }

    if (chainRunningRef.current) {
      return;
    }

    chainRunningRef.current = true;
    let cancelled = false;

    async function runChain(frontFileSafe: File | null, sideFileSafe: File | null) {
      try {
        if (!frontFileSafe || !sideFileSafe) {
          setProcessingPhase("error");
          setProcessingError({ message: "Fotos ausentes. Volte e refaça o fluxo." });
          return;
        }

        setProcessingError(null);

        if (!scanIdRef.current) {
          setProcessingPhase("creating");
          const created = await createScan({
            consent: true,
            source: "web" as ScanSource,
            weightKg: Number(anthro.weightKg),
            heightCm: Number(anthro.heightCm),
            ageYears: Number(anthro.ageYears),
            sex: anthro.sex as ScanSex,
            useBonusAllowance: isBonus || undefined,
          });
          if (cancelled) return;
          scanIdRef.current = created.scan.id;
        }

        if (!uploadedFrontRef.current) {
          setProcessingPhase("uploading_front");
          await uploadScanPhoto(scanIdRef.current, "front", frontFileSafe);
          if (cancelled) return;
          uploadedFrontRef.current = true;
        }

        if (!uploadedSideRef.current) {
          setProcessingPhase("uploading_side");
          await uploadScanPhoto(scanIdRef.current, "side", sideFileSafe);
          if (cancelled) return;
          uploadedSideRef.current = true;
        }

        setProcessingPhase("processing");
        const processed = await processScan(scanIdRef.current);
        if (cancelled) return;

        router.push(`/app/scan/${processed.scan.id}`);
      } catch (error: unknown) {
        if (cancelled) return;

        chainRunningRef.current = false;

        // For terminal backend states, navigate to detail (it explains the outcome).
        if (error instanceof ScanApiError) {
          if (
            scanIdRef.current
            && (error.code === "scan_image_rejected" || error.code === "scan_already_completed")
          ) {
            router.push(`/app/scan/${scanIdRef.current}`);
            return;
          }
          setProcessingError({
            code: error.code,
            message: getErrorCopyByCode(error.code),
            bonusAvailable: error.bonusAvailable,
          });
        } else {
          setProcessingError({ message: getErrorCopyByCode(undefined) });
        }
        setProcessingPhase("error");
      }
    }

    void runChain(frontFile, sideFile);

    return () => {
      cancelled = true;
    };
    // retryToken triggers a re-run after an error; refs preserve completed work.
  }, [stepKeyForEffect, retryToken, frontFile, sideFile, anthro, router, isBonus]);

  if (!me.isStudent) {
    return (
      <RoleGuard
        title="Scan corporal"
        description="O Scan corporal faz parte do espaço do aluno no Move."
      />
    );
  }

  const stepKey = SCAN_WIZARD_STEPS[stepIndex].key;
  const bmi = computeBmi(anthro.weightKg, anthro.heightCm);

  // Label for the stepper sub-progress when inside prep
  const stepperSubLabel = stepKey === "prep"
    ? `${prepSubIndex + 1} de ${TOTAL_PREP}`
    : undefined;

  const canContinue = (() => {
    switch (stepKey) {
      case "consent":
        return consentChecked;
      case "data":
        return (
          anthro.weightKg !== ""
          && anthro.heightCm !== ""
          && anthro.ageYears !== ""
          && anthro.sex !== ""
        );
      case "photo_front":
        return frontFile !== null;
      case "photo_side":
        return sideFile !== null;
      default:
        return true;
    }
  })();

  function goBack() {
    if (stepKey === "prep") {
      if (prepSubIndex > 0) {
        setPrepSubIndex((prev) => prev - 1);
        return;
      }
      // First prep sub-step → back to the outer previous step (consent)
      setStepIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    setStepIndex((prev) => Math.max(0, prev - 1));
  }

  function goNext() {
    if (stepKey === "prep") {
      if (prepSubIndex < TOTAL_PREP - 1) {
        setPrepSubIndex((prev) => prev + 1);
        return;
      }
      // Last prep sub-step → advance outer step; reset sub-index for next visit
      setPrepSubIndex(0);
      setStepIndex((prev) => Math.min(SCAN_WIZARD_STEPS.length - 1, prev + 1));
      return;
    }

    setPrepSubIndex(0);
    setStepIndex((prev) => Math.min(SCAN_WIZARD_STEPS.length - 1, prev + 1));
  }

  function updateAnthro(field: keyof Anthropometrics, value: string) {
    setAnthro((prev) => ({ ...prev, [field]: value }));
  }

  function handleSelectFront(file: File | null) {
    setFrontFile(file);
    setFrontPreviewUrl(file ? URL.createObjectURL(file) : null);
    // A foto mudou — invalida o upload anterior para forçar reenvio na próxima execução.
    uploadedFrontRef.current = false;
  }

  function handleSelectSide(file: File | null) {
    setSideFile(file);
    setSidePreviewUrl(file ? URL.createObjectURL(file) : null);
    uploadedSideRef.current = false;
  }

  function handleRetryProcessing() {
    chainRunningRef.current = false;
    setProcessingError(null);
    setProcessingPhase("creating");
    setRetryToken((token) => token + 1);
  }

  return (
    <div className="space-y-6 pb-4">
      <PageHeader title="Nova análise" description="Leva cerca de 2 minutos." />

      <ScanStepper
        steps={SCAN_WIZARD_STEPS}
        currentIndex={stepIndex}
        subLabel={stepperSubLabel}
      />

      {/* ── Step bodies ── */}

      {stepKey === "consent" && (
        <SectionCard>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-muted text-accent">
            <Lock size={20} strokeWidth={1.8} />
          </div>
          <h2 className="mt-4 text-base font-semibold text-foreground">
            Privacidade e consentimento
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li className="flex items-start gap-2">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-success" />
              Suas fotos são usadas apenas para gerar a sua estimativa.
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-success" />
              Você pode refazer as fotos antes de gerar a análise.
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-success" />
              Nada é compartilhado sem a sua autorização.
            </li>
          </ul>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background px-3 py-3">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(event) => setConsentChecked(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent"
            />
            <span className="text-xs leading-relaxed text-muted">
              Entendo que é uma estimativa, não um diagnóstico clínico, e autorizo o uso das minhas
              fotos para gerar a análise.
            </span>
          </label>
        </SectionCard>
      )}

      {stepKey === "prep" && (() => {
        const item = SCAN_PREP_ITEMS[prepSubIndex];

        if (!item) {
          return null;
        }

        return (
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Preparação {prepSubIndex + 1} de {TOTAL_PREP}
            </p>
            {item.kind === "compare" ? (
              <ScanCompareCard
                title={item.topic.title}
                description={item.topic.description}
                correctImageUrl={item.topic.correctImageUrl}
                incorrectImageUrl={item.topic.incorrectImageUrl}
              />
            ) : (
              <ScanGuideCard
                title={item.guide.title}
                instruction={item.guide.instruction}
                imageUrl={item.guide.imageUrl}
              />
            )}
          </div>
        );
      })()}

      {stepKey === "data" && (
        <SectionCard>
          <h2 className="text-base font-semibold text-foreground">Seus dados</h2>
          <p className="mt-1 text-xs text-muted">
            Pré-preenchemos com o seu perfil quando disponível. Ajuste se precisar.
          </p>

          {/* 2-col grid for numeric fields */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Peso (kg)</span>
              <input
                type="text"
                inputMode="decimal"
                value={anthro.weightKg}
                onChange={(event) => updateAnthro("weightKg", event.target.value)}
                placeholder="Ex: 72"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Altura (cm)</span>
              <input
                type="text"
                inputMode="numeric"
                value={anthro.heightCm}
                onChange={(event) => updateAnthro("heightCm", event.target.value)}
                placeholder="Ex: 175"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Idade</span>
              <input
                type="text"
                inputMode="numeric"
                value={anthro.ageYears}
                onChange={(event) => updateAnthro("ageYears", event.target.value)}
                placeholder="Ex: 30"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </label>
          </div>

          {/* Sexo — full-width segmented control so all 3 labels fit comfortably */}
          <div className="mt-3 space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Sexo</span>
            <div className="grid grid-cols-3 gap-2">
              {SEX_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateAnthro("sex", option.value)}
                  className={[
                    "rounded-xl border py-3 text-sm font-medium transition-colors",
                    anthro.sex === option.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-background text-muted hover:bg-surface-hover",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {bmi != null && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-accent/5 px-4 py-3">
              <span className="text-xs text-muted">IMC estimado</span>
              <span className="text-lg font-bold text-foreground">{bmi}</span>
            </div>
          )}
        </SectionCard>
      )}

      {stepKey === "photo_front" && (
        <div className="space-y-4">
          <ScanGuideCard
            title="Foto frontal"
            instruction="Mantenha-se ereto, de frente para a câmera, pés afastados e braços afastados do tronco."
            imageUrl={SCAN_PREP_ITEMS[4]?.kind === "guide" ? SCAN_PREP_ITEMS[4].guide.imageUrl : ""}
          />
          <ScanPhotoCapture
            label="Adicionar foto frontal"
            hint="Toque para usar a câmera ou escolher da galeria"
            previewUrl={frontPreviewUrl}
            onSelect={handleSelectFront}
          />
          <QualityTips />
        </div>
      )}

      {stepKey === "photo_side" && (
        <div className="space-y-4">
          <ScanGuideCard
            title="Foto lateral"
            instruction="Vire-se para sua esquerda, mostrando o lado direito para a câmera. Estenda o braço da frente na altura do ombro e mantenha a outra perna e braço escondidos atrás do corpo."
            imageUrl={SCAN_PREP_ITEMS[5]?.kind === "guide" ? SCAN_PREP_ITEMS[5].guide.imageUrl : ""}
          />
          <ScanPhotoCapture
            label="Adicionar foto lateral"
            hint="Toque para usar a câmera ou escolher da galeria"
            previewUrl={sidePreviewUrl}
            onSelect={handleSelectSide}
          />
          <QualityTips />
        </div>
      )}

      {stepKey === "review" && (
        <SectionCard>
          <h2 className="text-base font-semibold text-foreground">Revisão</h2>
          <p className="mt-1 text-xs text-muted">Confira antes de gerar a estimativa.</p>

          <div className="mt-4 divide-y divide-border">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted">Peso</span>
              <span className="text-sm font-medium text-foreground">
                {anthro.weightKg ? `${anthro.weightKg} kg` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted">Altura</span>
              <span className="text-sm font-medium text-foreground">
                {anthro.heightCm ? `${anthro.heightCm} cm` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted">Idade</span>
              <span className="text-sm font-medium text-foreground">
                {anthro.ageYears ? `${anthro.ageYears} anos` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted">Sexo</span>
              <span className="text-sm font-medium text-foreground">
                {SEX_OPTIONS.find((option) => option.value === anthro.sex)?.label ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted">Foto frontal</span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                <Check size={14} strokeWidth={2.5} />
                Adicionada
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted">Foto lateral</span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                <Check size={14} strokeWidth={2.5} />
                Adicionada
              </span>
            </div>
          </div>

          {isBonus && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2.5">
              <Sparkles size={14} className="shrink-0 text-accent" />
              <p className="text-xs text-accent">Você está usando sua análise extra gratuita.</p>
            </div>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-muted">{SCAN_DISCLAIMER}</p>
        </SectionCard>
      )}

      {stepKey === "processing" && processingPhase !== "error" && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <Loader2 size={28} className="animate-spin text-accent" />
          <p className="text-sm font-semibold text-foreground">{PHASE_LABEL[processingPhase]}</p>
          {processingPhase === "processing" && (
            <p className="max-w-xs text-xs text-muted">
              Mantenha esta tela aberta. Vamos te levar ao resultado assim que estiver pronto.
            </p>
          )}
        </div>
      )}

      {stepKey === "processing" && processingPhase === "error" && processingError && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {processingError.code === "scan_limit_reached" || processingError.code === "scan_cooldown_active"
                ? "Nova análise indisponível"
                : "Não foi possível concluir a análise"}
            </h2>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted">
              {processingError.message}
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-2">
            {processingError.code === "scan_cooldown_active"
              && !isBonus
              && processingError.bonusAvailable === true && (
              <Link
                href="/app/scan/novo?bonus=1"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
              >
                <Sparkles size={16} />
                Usar análise extra grátis
              </Link>
            )}
            {processingError.code !== "scan_limit_reached"
              && processingError.code !== "scan_cooldown_active" && (
              <button
                type="button"
                onClick={handleRetryProcessing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
              >
                Tentar novamente
              </button>
            )}
            <Link
              href="/app/scan"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-strong px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              Voltar ao Hub
            </Link>
          </div>
        </div>
      )}

      {/* ── Footer (hidden during processing) ── */}
      {stepKey !== "processing" && (
        <div className="flex items-center gap-2">
          {stepIndex === 0 ? (
            <Link
              href="/app/scan"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-strong px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              Cancelar
            </Link>
          ) : (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-strong px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          )}

          <button
            type="button"
            onClick={goNext}
            disabled={!canContinue}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {stepKey === "review" ? "Gerar análise" : "Continuar"}
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
