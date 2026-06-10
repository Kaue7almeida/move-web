"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Sparkles, User, ExternalLink, Sun, Moon } from "lucide-react";

import {
  UnauthenticatedRequestError,
  authenticatedFetch,
  readApiErrorMessage,
} from "@/services/api/authenticatedFetch";
import {
  ChatApiError,
  getTrainerAiSettings,
  updateTrainerAiSettings,
} from "@/services/chat/chatService";
import type { TrainerAiMode } from "@/bff/modules/chat/types";

import { useAppShell } from "../AppShellContext";
import { useTheme, type ThemeMode } from "../ThemeContext";
import { PageHeader, SectionCard } from "../app-ui";
import { getRelationshipSummary, getRoleLabel } from "../app-utils";
import { ConfirmActionModal } from "../_components/ConfirmActionModal";

function formatLinkedSince(iso: string | null): string {
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

/* ─── Student-side relationship management (discreet) ─── */
function StudentTrainerLinks() {
  const { me, setMe } = useAppShell();
  const activeLinks = me.relationships.filter(
    (relationship) =>
      relationship.student_user_id === me.user.id && relationship.status === "active",
  );

  const [leavingTrainerId, setLeavingTrainerId] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  if (activeLinks.length === 0) {
    return null;
  }

  async function handleConfirmLeave() {
    if (!leavingTrainerId) return;

    setIsLeaving(true);
    setLeaveError(null);

    try {
      const response = await authenticatedFetch(
        `/api/v1/student/trainers/${leavingTrainerId}`,
        { method: "DELETE" },
      );

      if (response.status === 401) {
        throw new UnauthenticatedRequestError();
      }

      if (!response.ok) {
        setLeaveError(
          await readApiErrorMessage(response, "Não foi possível encerrar o vínculo."),
        );
        setIsLeaving(false);
        return;
      }

      await response.json();

      const endedAt = new Date().toISOString();
      setMe({
        ...me,
        relationships: me.relationships.map((relationship) =>
          relationship.trainer_user_id === leavingTrainerId
          && relationship.student_user_id === me.user.id
          && relationship.status === "active"
            ? { ...relationship, status: "ended", ended_at: endedAt }
            : relationship,
        ),
      });
      setLeavingTrainerId(null);
    } catch (error: unknown) {
      setLeaveError(
        error instanceof UnauthenticatedRequestError
          ? "Sua sessão expirou. Entre novamente."
          : "Não foi possível encerrar o vínculo.",
      );
    } finally {
      setIsLeaving(false);
    }
  }

  return (
    <SectionCard>
      <div>
        <h3 className="text-sm font-semibold text-foreground">Meus profissionais</h3>
        <p className="mt-0.5 text-xs text-muted">
          Personais conectados ao seu espaço no Move.
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {activeLinks.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">Seu personal</p>
              <p className="truncate text-[11px] text-muted">
                Conectado desde {formatLinkedSince(link.started_at ?? link.created_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLeaveError(null);
                setLeavingTrainerId(link.trainer_user_id);
              }}
              className="shrink-0 text-xs font-medium text-muted underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              Encerrar vínculo
            </button>
          </div>
        ))}
      </div>

      {leavingTrainerId && (
        <ConfirmActionModal
          title="Encerrar vínculo"
          confirmLabel="Encerrar vínculo"
          isLoading={isLeaving}
          errorMessage={leaveError}
          onConfirm={() => void handleConfirmLeave()}
          onClose={() => {
            if (!isLeaving) {
              setLeavingTrainerId(null);
              setLeaveError(null);
            }
          }}
          description={
            <>
              <p>
                Ao encerrar o vínculo, você deixa de receber novos treinos e perde o acesso à
                galeria deste personal.
              </p>
              <p>Seu histórico de treinos já registrado é preservado.</p>
              <p>Você pode se reconectar depois pelo link de convite do personal.</p>
            </>
          }
        />
      )}
    </SectionCard>
  );
}

function InfoRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-muted">{label}</span>
      <span
        className={[
          "text-sm font-medium",
          muted ? "text-muted" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Theme selector ─── */
function ThemeOption({
  mode,
  label,
  icon: Icon,
  active,
  onSelect,
}: {
  mode: ThemeMode;
  label: string;
  icon: typeof Sun;
  active: boolean;
  onSelect: (mode: ThemeMode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={[
        "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-on"
          : "bg-surface-strong text-muted-foreground hover:bg-surface-hover hover:text-foreground",
      ].join(" ")}
    >
      <Icon size={16} strokeWidth={1.8} />
      {label}
    </button>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <SectionCard>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Aparência</h3>
          <p className="mt-0.5 text-xs text-muted">
            Escolha como o Move aparece para você.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <ThemeOption
          mode="light"
          label="Claro"
          icon={Sun}
          active={theme === "light"}
          onSelect={setTheme}
        />
        <ThemeOption
          mode="dark"
          label="Escuro"
          icon={Moon}
          active={theme === "dark"}
          onSelect={setTheme}
        />
      </div>
    </SectionCard>
  );
}

/* ─── Trainer AI settings ─── */

type AiMode = TrainerAiMode;

type TrainerAiForm = {
  mode: AiMode;
  tone: string;
  instructions: string;
  preferredExercises: string;
  restrictions: string;
};

const AI_MODE_OPTIONS: Array<{
  value: AiMode;
  label: string;
  description: string;
  comingSoon?: boolean;
}> = [
  {
    value: "off",
    label: "Desligada",
    description: "A IA não responde seus alunos.",
  },
  {
    value: "suggest",
    label: "Sugerir resposta",
    description: "A IA prepara uma resposta para você revisar antes de enviar.",
    comingSoon: true,
  },
  {
    value: "auto_reply",
    label: "Responder automaticamente",
    description: "A IA responde os alunos automaticamente nas conversas habilitadas.",
  },
];

function deriveFormMode(enabled: boolean, mode: AiMode): AiMode {
  // "suggest" ainda não tem fluxo real: na prática se comporta como desligada,
  // então o formulário mostra "off" até o modo existir de verdade.
  if (!enabled || mode === "off" || mode === "suggest") return "off";
  return mode;
}

function parseExercisesToText(exercises: unknown): string {
  if (!Array.isArray(exercises)) return "";
  return exercises
    .filter((item): item is string => typeof item === "string")
    .join("\n");
}

function parseExercisesToArray(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function AiModeButton({
  option,
  isActive,
  onSelect,
}: {
  option: (typeof AI_MODE_OPTIONS)[number];
  isActive: boolean;
  onSelect: () => void;
}) {
  const isComingSoon = Boolean(option.comingSoon);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isComingSoon}
      className={[
        "flex flex-1 flex-col rounded-lg border px-3 py-3 text-left transition-colors",
        isComingSoon
          ? "cursor-not-allowed border-border bg-background opacity-60"
          : isActive
            ? "border-accent/40 bg-accent-soft"
            : "border-border bg-background hover:bg-surface-hover",
      ].join(" ")}
    >
      <span className="flex items-center gap-2">
        <span
          className={[
            "text-sm font-semibold",
            isActive ? "text-accent" : "text-foreground",
          ].join(" ")}
        >
          {option.label}
        </span>
        {isComingSoon && (
          <span className="rounded bg-surface-strong px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted">
            Em breve
          </span>
        )}
      </span>
      <span className="mt-0.5 text-[11px] leading-relaxed text-muted">
        {option.description}
      </span>
    </button>
  );
}

function TrainerAiSettingsSection() {
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<TrainerAiForm>({
    mode: "off",
    tone: "",
    instructions: "",
    preferredExercises: "",
    restrictions: "",
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await getTrainerAiSettings();

        if (!mounted) return;

        const s = response.settings;
        setForm({
          mode: deriveFormMode(s.enabled, s.mode),
          tone: s.tone ?? "",
          instructions: s.instructions ?? "",
          preferredExercises: parseExercisesToText(s.preferredExercises),
          restrictions: s.restrictions ?? "",
        });
        setLoadState("ready");
      } catch (error: unknown) {
        if (!mounted) return;
        setLoadError(
          error instanceof ChatApiError
            ? error.message
            : "Não foi possível carregar as configurações da IA.",
        );
        setLoadState("error");
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  function setField<K extends keyof TrainerAiForm>(key: K, value: TrainerAiForm[K]) {
    if (saveState === "success") setSaveState("idle");
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState("saving");
    setSaveError(null);

    try {
      const enabled = form.mode !== "off";
      await updateTrainerAiSettings({
        enabled,
        mode: form.mode,
        tone: form.tone.trim() || null,
        instructions: form.instructions.trim() || null,
        preferredExercises: parseExercisesToArray(form.preferredExercises),
        restrictions: form.restrictions.trim() || null,
      });
      setSaveState("success");
    } catch (error: unknown) {
      setSaveError(
        error instanceof ChatApiError
          ? error.message
          : "Não foi possível salvar as configurações.",
      );
      setSaveState("error");
    }
  }

  return (
    <SectionCard>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-muted text-accent">
          <Sparkles size={18} strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">IA do personal</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Configure como a IA deve responder seus alunos quando estiver habilitada.
          </p>
        </div>
      </div>

      {/* Loading */}
      {loadState === "loading" && (
        <div className="mt-5 flex items-center gap-2 text-sm text-muted">
          <Loader2 size={16} className="animate-spin text-accent" />
          Carregando configurações...
        </div>
      )}

      {/* Load error */}
      {loadState === "error" && (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {loadError}
        </div>
      )}

      {/* Form */}
      {loadState === "ready" && (
        <form onSubmit={(e) => { void handleSave(e); }} className="mt-5 space-y-5">

          {/* Mode selector */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted">
              Status da IA
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              {AI_MODE_OPTIONS.map((option) => (
                <AiModeButton
                  key={option.value}
                  option={option}
                  isActive={form.mode === option.value}
                  onSelect={() => setField("mode", option.value)}
                />
              ))}
            </div>
            {form.mode === "auto_reply" && (
              <p className="text-[11px] leading-relaxed text-muted">
                A IA responde automaticamente. O aluno pode pedir para falar com você a qualquer momento.
              </p>
            )}
          </fieldset>

          {/* Tone */}
          <div className="space-y-1.5">
            <label htmlFor="ai-tone" className="text-xs font-medium text-muted">
              Tom de voz{" "}
              <span className="font-normal text-muted opacity-75">(máx. 300 caracteres)</span>
            </label>
            <input
              id="ai-tone"
              type="text"
              value={form.tone}
              onChange={(e) => setField("tone", e.target.value)}
              maxLength={300}
              placeholder="Ex: amigável, motivador e direto ao ponto"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
            />
          </div>

          {/* Instructions */}
          <div className="space-y-1.5">
            <label htmlFor="ai-instructions" className="text-xs font-medium text-muted">
              Instruções da IA{" "}
              <span className="font-normal text-muted opacity-75">(máx. 2000 caracteres)</span>
            </label>
            <textarea
              id="ai-instructions"
              value={form.instructions}
              onChange={(e) => setField("instructions", e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Ex: Sempre incentive o aluno. Nunca sugira exercícios que substituam a prescrição do personal."
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
            />
            <p className="text-right text-[11px] text-muted">
              {form.instructions.length}/2000
            </p>
          </div>

          {/* Preferred exercises */}
          <div className="space-y-1.5">
            <label htmlFor="ai-exercises" className="text-xs font-medium text-muted">
              Exercícios preferidos
            </label>
            <textarea
              id="ai-exercises"
              value={form.preferredExercises}
              onChange={(e) => setField("preferredExercises", e.target.value)}
              rows={3}
              placeholder={"Agachamento livre\nSupino com barra\nLevantamento terra"}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
            />
            <p className="text-[11px] text-muted">
              Um exercício por linha. A IA vai priorizar esses exercícios ao sugerir treinos.
            </p>
          </div>

          {/* Restrictions */}
          <div className="space-y-1.5">
            <label htmlFor="ai-restrictions" className="text-xs font-medium text-muted">
              Restrições{" "}
              <span className="font-normal text-muted opacity-75">(máx. 1000 caracteres)</span>
            </label>
            <textarea
              id="ai-restrictions"
              value={form.restrictions}
              onChange={(e) => setField("restrictions", e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Ex: Não prescreva exercícios de alto impacto sem minha aprovação. Não discuta suplementação."
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
            />
          </div>

          {/* Footer: save button + feedback */}
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {saveState === "success" && (
                <span className="flex items-center gap-1.5 text-sm text-success">
                  <CheckCircle2 size={14} />
                  Configurações salvas.
                </span>
              )}
              {saveState === "error" && saveError && (
                <span className="flex items-center gap-1.5 text-sm text-red-500">
                  <AlertCircle size={14} />
                  {saveError}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={saveState === "saving"}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {saveState === "saving" && <Loader2 size={14} className="animate-spin" />}
              {saveState === "saving" ? "Salvando..." : "Salvar configuração"}
            </button>
          </div>
        </form>
      )}
    </SectionCard>
  );
}

export default function ProfilePage() {
  const { me, isTrainer, displayName } = useAppShell();
  const stats = getRelationshipSummary(me);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu perfil"
        description="Suas informações dentro do Move."
        action={
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <ExternalLink size={14} />
            Editar dados
          </Link>
        }
      />

      {/* Profile card */}
      <SectionCard>
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-muted">
            <User size={24} className="text-accent" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">
              {displayName ?? "Perfil em configuração"}
            </p>
            <p className="mt-0.5 text-sm text-muted">{getRoleLabel(me)}</p>
          </div>
        </div>

        <div className="divide-y divide-border">
          <InfoRow
            label="E-mail"
            value={me.user.email ?? "Não informado"}
          />

          {isTrainer ? (
            <>
              <InfoRow
                label="Especialidades"
                value={
                  me.trainerProfile?.specialties.length
                    ? me.trainerProfile.specialties.join(", ")
                    : "Não informado"
                }
                muted={!me.trainerProfile?.specialties.length}
              />
              <InfoRow
                label="Modelo de trabalho"
                value={me.trainerProfile?.work_model ?? "Não informado"}
                muted={!me.trainerProfile?.work_model}
              />
              <InfoRow
                label="Faixa de alunos"
                value={me.trainerProfile?.student_count_range ?? "Não informado"}
                muted={!me.trainerProfile?.student_count_range}
              />
              <InfoRow
                label="Alunos conectados"
                value={`${stats.startedCount}`}
              />
            </>
          ) : (
            <>
              <InfoRow
                label="Objetivo"
                value={me.studentProfile?.training_goal ?? "Não informado"}
                muted={!me.studentProfile?.training_goal}
              />
              <InfoRow
                label="Nível"
                value={me.studentProfile?.training_level ?? "Não informado"}
                muted={!me.studentProfile?.training_level}
              />
              <InfoRow
                label="Personal"
                value={
                  stats.activeCount > 0
                    ? `${stats.activeCount} conectado${stats.activeCount > 1 ? "s" : ""}`
                    : "Aguardando conexão"
                }
                muted={stats.activeCount === 0}
              />
            </>
          )}
        </div>
      </SectionCard>

      {/* Student-side relationship management (hidden when there are no active links) */}
      <StudentTrainerLinks />

      {/* Appearance */}
      <AppearanceSection />

      {/* Trainer AI settings — visible only for personal/trainer */}
      {isTrainer && <TrainerAiSettingsSection />}
    </div>
  );
}
