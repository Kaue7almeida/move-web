"use client";

import type { ReactNode } from "react";
import { Loader2, X } from "lucide-react";

/**
 * Discreet confirmation modal for secondary/destructive actions.
 * The destructive affordance lives here (inside the modal), not on the list/card.
 */
export function ConfirmActionModal({
  title,
  description,
  confirmLabel,
  isLoading,
  errorMessage,
  onConfirm,
  onClose,
}: {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  isLoading: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isLoading ? undefined : onClose}
        onKeyDown={() => {}}
        role="presentation"
      />

      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-muted">
          {description}
        </div>

        {errorMessage && (
          <div className="mx-5 mb-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-xs text-red-500">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg bg-surface-strong px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
