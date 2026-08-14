"use client";

import { useState } from "react";
import { Activity, ArrowLeft, Camera, Candy, PenLine, Plus } from "lucide-react";

import { ActivityFlow } from "./ActivityFlow";
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
        {view === "activity" && <ActivityFlow onSaved={onSaved} onDone={close} />}
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
