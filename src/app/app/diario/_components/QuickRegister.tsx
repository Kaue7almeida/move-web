"use client";

import { useState } from "react";
import { Activity, ArrowLeft, Camera, Candy, Check, Loader2, PenLine, Plus } from "lucide-react";

import { addActivity } from "@/services/foodDiary/foodDiaryService";

import { QUICK_ACTIVITIES } from "../_content";
import { describeFoodDiaryError } from "../_errors";
import { BottomSheet } from "./BottomSheet";
import { TextMealFlow } from "./TextMealFlow";

type View = "menu" | "text" | "snack" | "activity";

const TITLES: Record<View, string> = {
  menu: "Registrar",
  text: "Descrever o que comi",
  snack: "Docinho ou petisco",
  activity: "Registrar atividade",
};

/**
 * Hub universal "+ Registrar" — bottom sheet com as 4 formas de registro:
 * fotografar (fluxo real existente), descrever por texto, docinho/petisco e
 * atividade. Reusa o BottomSheet e o MealReview compartilhado.
 */
export function QuickRegister({
  onStartPhoto,
  onSaved,
}: {
  onStartPhoto: () => void;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");

  function close() {
    setOpen(false);
    setView("menu");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setView("menu");
          setOpen(true);
        }}
        className="dia-rise flex w-full items-center justify-center gap-2.5 rounded-2xl bg-accent px-6 py-4 text-sm font-bold text-accent-on shadow-[0_8px_30px_rgba(242,106,27,0.28)] transition-all hover:bg-accent-hover"
      >
        <Plus size={18} strokeWidth={2.4} />
        Registrar
      </button>

      <BottomSheet open={open} onClose={close} title={TITLES[view]}>
        {view !== "menu" && (
          <button
            type="button"
            onClick={() => setView("menu")}
            className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted hover:text-foreground"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
        )}

        {view === "menu" && (
          <div className="space-y-2.5">
            <Option
              icon={Camera}
              label="Fotografar refeição"
              description="Foto do prato → IA estima → você confirma"
              onClick={() => {
                close();
                onStartPhoto();
              }}
            />
            <Option
              icon={PenLine}
              label="Descrever o que comi"
              description="Ex.: 2 pães de queijo e café com leite"
              onClick={() => setView("text")}
            />
            <Option
              icon={Candy}
              label="Docinho ou petisco"
              description="Chocolate, castanhas, biscoito…"
              onClick={() => setView("snack")}
            />
            <Option
              icon={Activity}
              label="Atividade"
              description="Some o gasto de um treino ou caminhada"
              onClick={() => setView("activity")}
            />
          </div>
        )}

        {view === "text" && <TextMealFlow mode="text" onSaved={onSaved} onDone={close} />}
        {view === "snack" && <TextMealFlow mode="snack" onSaved={onSaved} onDone={close} />}
        {view === "activity" && (
          <ActivityForm
            onSaved={() => {
              onSaved();
              close();
            }}
          />
        )}
      </BottomSheet>
    </>
  );
}

function Option({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3.5 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent/40 hover:bg-surface-hover"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
      </span>
    </button>
  );
}

/**
 * Registro de atividade (bottom sheet). Sem IA nesta versão: o usuário escolhe um
 * card de atividade comum (que preenche os campos) ou informa manualmente. Campos
 * claros — atividade, duração (opcional) e GASTO ESTIMADO em kcal, sempre explícito.
 * O gasto soma ao gasto do dia no motor energético.
 */
function ActivityForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [kcal, setKcal] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kcalValue = Math.round(Number(kcal));
  const canSave = Number.isFinite(kcalValue) && kcalValue > 0 && !pending;

  function prefill(activity: { label: string; kcal: number }) {
    setName(activity.label);
    setDurationMin("");
    setKcal(String(activity.kcal));
    setError(null);
  }

  async function save() {
    if (!canSave) {
      return;
    }

    const trimmedName = name.trim() || "Atividade";
    const duration = Number(durationMin);
    const label =
      Number.isFinite(duration) && duration > 0
        ? `${trimmedName} · ${Math.round(duration)} min`
        : trimmedName;

    setPending(true);
    setError(null);

    try {
      await addActivity({ label, kcalBurned: kcalValue });
      onSaved();
    } catch (caught) {
      setError(describeFoodDiaryError(caught).message);
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Atividades comuns</p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIVITIES.map((activity) => (
            <button
              key={activity.label}
              type="button"
              disabled={pending}
              onClick={() => prefill(activity)}
              className="flex flex-col items-start gap-1 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-success/50 disabled:opacity-50"
            >
              <span className="text-sm font-bold text-foreground">{activity.label}</span>
              <span className="text-[11px] text-muted">
                gasto estimado ≈ <span className="font-semibold text-success">{activity.kcal} kcal</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
        <label className="block">
          <span className="text-[11px] font-medium text-muted">Atividade</span>
          <input
            type="text"
            value={name}
            disabled={pending}
            placeholder="Ex.: corrida, musculação…"
            onChange={(event) => setName(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[11px] font-medium text-muted">
              Duração (min) <span className="normal-case text-muted/70">· opcional</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={durationMin}
              disabled={pending}
              placeholder="40"
              onChange={(event) => setDurationMin(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-muted">Gasto estimado (kcal)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={kcal}
              disabled={pending}
              placeholder="250"
              onChange={(event) => setKcal(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted"
            />
          </label>
        </div>

        <p className="text-[11px] leading-relaxed text-muted">
          O gasto é uma estimativa que você informa (kcal) — sem IA nesta versão. Ele soma ao seu gasto do
          dia, então comer um pouco mais continua dentro do plano.
        </p>
      </div>

      {error && (
        <p className="text-[11px] font-medium text-accent" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void save()}
        disabled={!canSave}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {canSave ? `Adicionar · ${kcalValue} kcal` : "Adicionar atividade"}
      </button>
    </div>
  );
}
