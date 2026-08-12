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

function ActivityForm({ onSaved }: { onSaved: () => void }) {
  const [label, setLabel] = useState("");
  const [kcal, setKcal] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(activityLabel: string, value: number) {
    if (!Number.isFinite(value) || value <= 0 || pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      await addActivity({ label: activityLabel, kcalBurned: Math.round(value) });
      onSaved();
    } catch (caught) {
      setError(describeFoodDiaryError(caught).message);
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIVITIES.map((activity) => (
          <button
            key={activity.label}
            type="button"
            disabled={pending}
            onClick={() => void add(activity.label, activity.kcal)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-success/50 hover:text-foreground disabled:opacity-50"
          >
            <Plus size={13} />
            {activity.label}
            <span className="font-bold text-success">+{activity.kcal}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Outra atividade..."
          value={label}
          disabled={pending}
          onChange={(event) => setLabel(event.target.value)}
          className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted"
        />
        <input
          type="number"
          placeholder="kcal"
          min={0}
          value={kcal}
          disabled={pending}
          onChange={(event) => setKcal(event.target.value)}
          className="h-10 w-20 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted"
        />
        <button
          type="button"
          onClick={() => void add(label.trim() || "Atividade", Number(kcal))}
          disabled={pending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-strong text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
          title="Adicionar atividade"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        </button>
      </div>

      {error && (
        <p className="text-[11px] font-medium text-accent" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
