"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * Bottom sheet reutilizável (mobile-first) que vira modal centralizado no desktop.
 * Acessível (role=dialog, aria-modal, foco inicial, Esc para fechar), com backdrop,
 * scroll-lock do body, safe-area e swipe-para-baixo no mobile.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Slide-in after mount; body scroll-lock while open. State resets happen in the
  // cleanup (on close), never synchronously in the effect body.
  useEffect(() => {
    if (!open) {
      return;
    }

    const raf = requestAnimationFrame(() => setMounted(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      setMounted(false);
      setDragY(0);
      setDragging(false);
    };
  }, [open]);

  // Esc closes.
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function onTouchStart(event: React.TouchEvent) {
    startYRef.current = event.touches[0]?.clientY ?? null;
    setDragging(true);
  }

  function onTouchMove(event: React.TouchEvent) {
    if (startYRef.current === null) {
      return;
    }

    const delta = (event.touches[0]?.clientY ?? 0) - startYRef.current;
    setDragY(Math.max(0, delta));
  }

  function onTouchEnd() {
    startYRef.current = null;
    setDragging(false);

    if (dragY > 110) {
      onClose();
    } else {
      setDragY(0);
    }
  }

  const translateY = mounted ? dragY : Math.max(dragY, 600);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className={[
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity",
          mounted ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        style={{ transform: `translateY(${translateY}px)`, transition: dragging ? "none" : "transform 0.28s ease-out" }}
        className="relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-2xl outline-none sm:max-w-lg sm:rounded-3xl"
      >
        <div
          className="shrink-0 cursor-grab touch-none border-b border-border px-5 pb-3 pt-3"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border-strong sm:hidden" aria-hidden="true" />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
