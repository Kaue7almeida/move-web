import type { ComponentType, ReactNode } from "react";
import { Check } from "lucide-react";

/**
 * Blocos visuais do kit de marketing do MoveX Fit.
 *
 * Diretrizes:
 * - Peças em pixel fixo (1080x1080, 1080x1920, 1920x1080) para export em PNG
 *   via captura headless — nada aqui é responsivo de propósito.
 * - Identidade fiel ao produto: dark #0a0a0a, accent único #f26a1b,
 *   Space Grotesk (display) + Manrope (texto).
 * - Os mocks reproduzem telas e textos reais do app (execução guiada,
 *   painel de sessões, MoveScan, treino do dia) — sem dados de usuários.
 * - `zoom` (CSS) escala cada mock a partir do layout base em px.
 */

type IconComponent = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

/* ─── Canvas base de cada peça ─── */

export function Canvas({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  return (
    <div
      className="relative isolate overflow-hidden bg-[#0a0a0a] text-white"
      style={{ width, height }}
    >
      <div className="pointer-events-none absolute inset-0 -z-30 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:120px_120px]" />
      {children}
    </div>
  );
}

/** Brilho radial laranja — posicionar via className (absolute + coordenadas). */
export function Glow({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute -z-20 rounded-full bg-[radial-gradient(circle,rgba(242,106,27,0.22),transparent_65%)] ${className}`}
    />
  );
}

/* ─── Identidade ─── */

export function Wordmark({ size = 44 }: { size?: number }) {
  return (
    <p
      className="font-display font-semibold leading-none tracking-[-0.05em] text-white"
      style={{ fontSize: size }}
    >
      MoveX <span className="text-[#f26a1b]">Fit</span>
    </p>
  );
}

export function Eyebrow({
  size = 22,
  children,
}: {
  size?: number;
  children: string;
}) {
  return (
    <p
      className="font-semibold uppercase tracking-[0.26em] text-[#f26a1b]"
      style={{ fontSize: size }}
    >
      {children}
    </p>
  );
}

export function DomainPill({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center rounded-full bg-[#f26a1b] font-semibold tracking-[-0.01em] text-white shadow-[0_18px_42px_rgba(242,106,27,0.32)]"
      style={{ fontSize: size, padding: `${size * 0.6}px ${size * 1.25}px` }}
    >
      movexfit.com.br
    </span>
  );
}

export function FeatureChip({
  icon: Icon,
  label,
  size = 24,
}: {
  icon: IconComponent;
  label: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex items-center gap-[0.55em] whitespace-nowrap rounded-full border border-white/12 bg-white/[0.04] font-medium text-white/85"
      style={{ fontSize: size, padding: `${size * 0.5}px ${size * 0.95}px` }}
    >
      <Icon size={size * 1.05} strokeWidth={2} className="shrink-0 text-[#f26a1b]" />
      {label}
    </span>
  );
}

/** Linha curta de benefício com check laranja. */
export function BenefitRow({
  size = 26,
  children,
}: {
  size?: number;
  children: string;
}) {
  return (
    <div className="flex items-center gap-[0.6em]" style={{ fontSize: size }}>
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-[#f26a1b]/14 text-[#f26a1b]"
        style={{ width: size * 1.35, height: size * 1.35 }}
      >
        <Check size={size * 0.75} strokeWidth={2.6} />
      </span>
      <span className="font-medium text-white/85">{children}</span>
    </div>
  );
}

/* ─── Mocks de tela (base em px, escalados com zoom) ─── */

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-2 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tracking-[-0.02em] text-white">{value}</p>
    </div>
  );
}

function PhoneFrame({ zoom = 1, children }: { zoom?: number; children: ReactNode }) {
  return (
    <div
      style={{ zoom }}
      className="relative w-[302px] rounded-[42px] border border-white/12 bg-gradient-to-b from-white/[0.09] to-white/[0.02] p-2.5 shadow-[0_40px_110px_rgba(0,0,0,0.6)]"
    >
      <div className="absolute inset-x-0 top-2.5 z-10 flex justify-center">
        <div className="h-6 w-24 rounded-b-2xl bg-black/85" />
      </div>
      <div className="overflow-hidden rounded-[34px] bg-[#0d0d0d] px-5 pb-5 pt-10">
        {children}
      </div>
    </div>
  );
}

/** Tela de execução guiada — fiel ao módulo de treino do app. */
export function PhoneExecution({ zoom = 1 }: { zoom?: number }) {
  return (
    <PhoneFrame zoom={zoom}>
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
        <span>Treino A</span>
        <span>03 / 07</span>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f26a1b]">
          Em execução
        </p>
        <h5 className="mt-2 font-display text-lg font-semibold leading-[1.1] tracking-[-0.03em] text-white">
          Supino reto com halteres
        </h5>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniStat label="Série" value="2/3" />
          <MiniStat label="Reps" value="10" />
          <MiniStat label="Carga" value="26 kg" />
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/8 bg-[#0a0a0a] p-3.5">
        <div className="flex items-center justify-between text-[11px] text-white/55">
          <span>Descanso</span>
          <span className="font-semibold text-white">01:12</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
          <div className="h-full w-[58%] rounded-full bg-[#f26a1b]" />
        </div>
      </div>

      <div className="mt-4 rounded-full bg-[#f26a1b] py-2.5 text-center text-[13px] font-semibold text-white shadow-[0_14px_28px_rgba(242,106,27,0.28)]">
        Concluir série
      </div>
    </PhoneFrame>
  );
}

/** Tela de treino do dia — o treino aplicado já aparece pronto para o aluno. */
export function PhoneToday({ zoom = 1 }: { zoom?: number }) {
  const exercises = [
    { ex: "Supino reto com halteres", det: "3 x 10", done: true },
    { ex: "Desenvolvimento halter", det: "3 x 10", done: true },
    { ex: "Remada curvada", det: "4 x 12", done: false },
    { ex: "Elevação lateral", det: "3 x 15", done: false },
  ];

  return (
    <PhoneFrame zoom={zoom}>
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
        <span>Treino de hoje</span>
        <span>4 exercícios</span>
      </div>

      <h5 className="mt-3 font-display text-lg font-semibold leading-[1.1] tracking-[-0.03em] text-white">
        Treino B — Superior
      </h5>

      <div className="mt-4 space-y-1.5">
        {exercises.map((row) => (
          <div
            key={row.ex}
            className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2"
          >
            {row.done ? (
              <Check size={13} className="shrink-0 text-[#22c55e]" strokeWidth={2.4} />
            ) : (
              <span className="h-[13px] w-[13px] shrink-0 rounded-full border border-white/20" />
            )}
            <span className="flex-1 truncate text-[12px] text-white/85">{row.ex}</span>
            <span className="text-[11px] text-white/45">{row.det}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-full bg-[#f26a1b] py-2.5 text-center text-[13px] font-semibold text-white shadow-[0_14px_28px_rgba(242,106,27,0.28)]">
        Iniciar treino
      </div>
    </PhoneFrame>
  );
}

/** Painel do personal — sessão executada com séries, reps e carga. */
export function WebPanel({ zoom = 1 }: { zoom?: number }) {
  const rows = [
    { ex: "Agachamento livre", set: "1/3", reps: "10", load: "60 kg" },
    { ex: "Agachamento livre", set: "2/3", reps: "10", load: "60 kg" },
    { ex: "Agachamento livre", set: "3/3", reps: "8", load: "55 kg" },
    { ex: "Desenvolvimento halter", set: "1/4", reps: "12", load: "14 kg" },
  ];

  return (
    <div
      style={{ zoom }}
      className="w-[560px] overflow-hidden rounded-2xl border border-white/10 bg-[#101010] shadow-[0_40px_120px_rgba(0,0,0,0.55)]"
    >
      <div className="flex items-center gap-2 border-b border-white/6 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
        </div>
        <div className="ml-3 text-[11px] font-medium text-white/40">
          movexfit.com.br / alunos / maria
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-5 pt-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f26a1b]">
            Sessão concluída
          </p>
          <h4 className="mt-2 font-display text-xl font-semibold tracking-[-0.03em] text-white">
            Treino A — Maria Santos
          </h4>
          <p className="mt-1 text-[12px] text-white/50">28 mai · 47 min · 18 séries</p>
        </div>
        <span className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#22c55e]">
          OK
        </span>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-t border-white/5 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
        <span>Exercício</span>
        <span>Série</span>
        <span>Reps</span>
        <span>Carga</span>
      </div>

      {rows.map((row, idx) => (
        <div
          key={idx}
          className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-t border-white/5 px-5 py-3 text-[13px]"
        >
          <span className="text-white/92">{row.ex}</span>
          <span className="text-white/50">{row.set}</span>
          <span className="font-semibold text-white">{row.reps}</span>
          <span className="font-semibold text-white">{row.load}</span>
        </div>
      ))}

      <div className="border-t border-white/5 px-5 py-3 text-[12px] text-white/50">
        + 14 séries registradas
      </div>
    </div>
  );
}

/** Resultado de MoveScan — métricas e comparação fiéis ao app, dados de exemplo. */
export function ScanCard({ zoom = 1 }: { zoom?: number }) {
  const metrics = [
    { label: "Gordura corporal", value: "22,4", unit: "%" },
    { label: "Massa magra", value: "58,2", unit: "kg" },
    { label: "IMC", value: "24,1", unit: "" },
    { label: "TMB", value: "1.680", unit: "kcal" },
  ];

  return (
    <div
      style={{ zoom }}
      className="w-[440px] rounded-3xl border border-white/10 bg-[#101010] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.55)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f26a1b]">
            MoveScan · Exemplo de resultado
          </p>
          <h4 className="mt-2 font-display text-xl font-semibold tracking-[-0.03em] text-white">
            Scan de 08 jul
          </h4>
        </div>
        <span className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
          2 fotos
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3.5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              {m.label}
            </p>
            <p className="mt-1.5 font-display text-[26px] font-semibold tracking-[-0.03em] text-white">
              {m.value}
              {m.unit && (
                <span className="ml-1 text-[14px] font-medium text-white/50">{m.unit}</span>
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-[#0a0a0a] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
          vs. scan anterior
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <span className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/12 px-3 py-1.5 text-[12px] font-semibold text-[#22c55e]">
            Gordura −1,2 p.p.
          </span>
          <span className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/12 px-3 py-1.5 text-[12px] font-semibold text-[#22c55e]">
            Massa magra +0,8 kg
          </span>
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-4 text-white/40">
        Estimativa visual a partir de fotos. Não é diagnóstico clínico.
      </p>
    </div>
  );
}
