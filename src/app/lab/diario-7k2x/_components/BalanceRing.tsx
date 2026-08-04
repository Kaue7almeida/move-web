"use client";

import { useEffect, useRef, useState } from "react";

/** Anima um número do valor anterior até o novo (rAF, ease-out). */
export function useCountUp(target: number, durationMs = 850): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);

  useEffect(() => {
    const from = displayRef.current;
    const delta = target - from;

    if (delta === 0) {
      return;
    }

    const startedAt = performance.now();
    let frame: number | null = null;

    function setValue(value: number) {
      displayRef.current = value;
      setDisplay(value);
    }

    function tick(now: number) {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setValue(Math.round(from + delta * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);

    // rAF fica suspenso em abas ocultas — este fallback garante o valor final.
    const safety = window.setTimeout(() => setValue(target), durationMs + 200);

    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      window.clearTimeout(safety);
    };
  }, [target, durationMs]);

  return display;
}

/**
 * Anel duplo de balanço calórico:
 *  - arco externo (laranja): consumido vs. meta
 *  - arco interno (verde): gasto vs. referência de gasto
 * Centro mostra o saldo disponível do dia (meta + gasto − consumido).
 */
export function BalanceRing({
  consumedKcal,
  targetKcal,
  burnedKcal,
  burnReferenceKcal,
}: {
  consumedKcal: number;
  targetKcal: number;
  burnedKcal: number;
  burnReferenceKcal: number;
}) {
  const size = 240;
  const outerStroke = 16;
  const innerStroke = 10;
  const outerRadius = (size - outerStroke) / 2;
  const innerRadius = outerRadius - outerStroke / 2 - innerStroke / 2 - 6;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  // Começa em 0 e transita para o valor real após montar,
  // para o CSS animar o preenchimento com a curva de mola.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // setTimeout (e não rAF) para disparar mesmo em abas ocultas.
    const timer = window.setTimeout(() => setMounted(true), 40);
    return () => window.clearTimeout(timer);
  }, []);

  const consumedRatio = targetKcal > 0 ? Math.min(consumedKcal / targetKcal, 1) : 0;
  const burnedRatio = burnReferenceKcal > 0 ? Math.min(burnedKcal / burnReferenceKcal, 1) : 0;

  const outerOffset = mounted
    ? outerCircumference * (1 - consumedRatio)
    : outerCircumference;
  const innerOffset = mounted
    ? innerCircumference * (1 - burnedRatio)
    : innerCircumference;

  const remaining = targetKcal + burnedKcal - consumedKcal;
  const isOver = remaining < 0;
  const displayRemaining = useCountUp(Math.abs(remaining));

  const isOnTrack = !isOver && consumedRatio > 0;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Aurora sutil girando atrás */}
      <div className="dlab-aurora absolute -inset-10 rounded-full" aria-hidden="true" />

      <svg
        width={size}
        height={size}
        className={["relative -rotate-90", isOnTrack ? "dlab-glow" : ""].join(" ")}
        aria-hidden="true"
      >
        {/* Trilhos */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={outerRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={outerStroke}
          className="text-surface-strong"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={innerStroke}
          className="text-surface-strong"
        />

        {/* Consumido (laranja) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={outerRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={outerStroke}
          strokeLinecap="round"
          strokeDasharray={outerCircumference}
          strokeDashoffset={outerOffset}
          className="dlab-ring-arc text-accent"
        />

        {/* Gasto (verde) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={innerStroke}
          strokeLinecap="round"
          strokeDasharray={innerCircumference}
          strokeDashoffset={innerOffset}
          className="dlab-ring-arc text-success"
          style={{ transitionDelay: "0.15s" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={[
            "font-display text-5xl font-bold tracking-tight",
            isOver ? "text-accent" : "text-foreground",
          ].join(" ")}
        >
          {displayRemaining}
        </span>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {isOver ? "kcal acima da meta" : "kcal disponíveis"}
        </span>
      </div>
    </div>
  );
}
