import type { CSSProperties, ReactNode } from "react";
import { Check, Clock, Dumbbell, Search, Sparkles, UserCheck } from "lucide-react";

import { Wordmark } from "../premium/premium-ui";

/**
 * Sistema visual da campanha "Stories — Fase 1" (foco: personal trainer).
 *
 * Meta: peças com cara de CAMPANHA, não de print da landing. Assinatura
 * própria desta leva:
 * - fundo cinematográfico (spotlight laranja + vinheta + grão);
 * - numeral-índice gigante fantasma ao fundo (01/02/03);
 * - headline staccato dominante, pouco texto, 1 ideia por peça;
 * - chrome consistente entre as 3 (marca no topo, domínio + trilho no rodapé).
 *
 * Fidelidade: os módulos reproduzem telas reais do app do personal
 * (gestão de Alunos, convite, Studio de Treino, Acompanhamento). Os frames
 * de device e várias telas vêm de ../premium/premium-ui (mocks fiéis já
 * validados). Nada inventa feature — só recompõe o que o produto já tem.
 *
 * Tudo em pixel fixo (1080x1920) para export headless em PNG.
 */

/* ─────────────── Canvas + atmosfera ─────────────── */

export function StoryCanvas({
  children,
  spotlight = "",
}: {
  children: ReactNode;
  /** classes de posição/tamanho do spotlight (absolute + w/h). */
  spotlight?: string;
}) {
  return (
    <div className="relative isolate overflow-hidden bg-[#070707] text-white" style={{ width: 1080, height: 1920 }}>
      {/* Spotlight principal */}
      <div
        className={`pointer-events-none absolute -z-10 rounded-full ${spotlight}`}
        style={{ background: "radial-gradient(circle, rgba(242,106,27,0.28), transparent 66%)" }}
      />
      {/* Streak diagonal sutil */}
      <div className="pointer-events-none absolute -inset-x-40 top-[540px] -z-10 h-[3px] rotate-[-8deg] bg-gradient-to-r from-transparent via-[#f26a1b]/25 to-transparent" />
      {/* Grão */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.055] mix-blend-screen"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Vinheta */}
      <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(130%_100%_at_50%_0%,transparent_52%,rgba(0,0,0,0.72)_100%)]" />
      {children}
    </div>
  );
}

/** Numeral-índice gigante fantasma ao fundo. */
export function GhostIndex({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <span
      className={`pointer-events-none absolute -z-10 select-none font-display font-bold leading-none tracking-[-0.06em] text-white/[0.035] ${className}`}
      style={{ fontSize: 860 }}
    >
      {children}
    </span>
  );
}

/* ─────────────── Chrome (topo + rodapé) ─────────────── */

export function TopBar({ index }: { index: string }) {
  return (
    <div className="absolute inset-x-0 top-[86px] flex items-center justify-between px-[84px]">
      <Wordmark size={40} />
      <div className="flex items-center gap-2.5 text-[16px] font-semibold tracking-[0.02em]">
        <span className="uppercase tracking-[0.24em] text-white/35">Stories</span>
        <span className="text-white">{index}</span>
        <span className="text-white/30">/ 03</span>
      </div>
    </div>
  );
}

/** Rodapé: CTA de domínio + trilho de progresso da campanha (1–3). */
export function Footer({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="absolute inset-x-0 bottom-[92px] px-[84px]">
      <div className="flex items-center justify-between gap-6">
        <span
          className="inline-flex items-center gap-[0.55em] rounded-full bg-[#f26a1b] font-semibold tracking-[-0.01em] text-white shadow-[0_22px_50px_rgba(242,106,27,0.42)]"
          style={{ fontSize: 32, padding: `${32 * 0.62}px ${32 * 1.2}px` }}
        >
          <span className="h-[11px] w-[11px] rounded-full bg-white/85" />
          movexfit.com.br
        </span>

        <div className="flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={[
                "h-[5px] rounded-full transition-all",
                n === step ? "w-10 bg-[#f26a1b]" : "w-5 bg-white/15",
              ].join(" ")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Tipografia ─────────────── */

export function Kicker({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-[0.7em] text-[22px]">
      <span className="h-px w-[2.4em] bg-[#f26a1b]" />
      <span className="font-semibold uppercase tracking-[0.28em] text-[#f26a1b]">{children}</span>
    </div>
  );
}

export function Headline({
  size = 120,
  children,
  className = "",
  style,
}: {
  size?: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <h1
      className={`font-display font-semibold leading-[0.94] tracking-[-0.045em] text-white ${className}`}
      style={{ fontSize: size, ...style }}
    >
      {children}
    </h1>
  );
}

/** Palavra em destaque laranja, com traço embaixo. */
export function Mark({ children }: { children: ReactNode }) {
  return (
    <span className="relative whitespace-nowrap text-[#f26a1b]">
      {children}
      <span className="absolute -bottom-[0.12em] left-0 h-[0.07em] w-full rounded-full bg-[#f26a1b]/45" />
    </span>
  );
}

export function Sub({
  size = 31,
  width,
  className = "",
  children,
}: {
  size?: number;
  width?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p className={`leading-[1.42] text-white/62 ${className}`} style={{ fontSize: size, width }}>
      {children}
    </p>
  );
}

/* ─────────────── Destaques flutuantes ─────────────── */

export function ProofChip({
  icon: Icon,
  label,
  tone = "accent",
  size = 22,
  className = "",
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  tone?: "accent" | "success";
  size?: number;
  className?: string;
}) {
  const toneClass =
    tone === "success"
      ? "border-[#22c55e]/30 bg-[#22c55e]/12 text-[#22c55e]"
      : "border-[#f26a1b]/30 bg-[#f26a1b]/12 text-[#f26a1b]";
  return (
    <span
      className={`inline-flex items-center gap-[0.5em] rounded-full border font-semibold shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur ${toneClass} ${className}`}
      style={{ fontSize: size, padding: `${size * 0.5}px ${size * 0.9}px` }}
    >
      <Icon size={size * 1.05} strokeWidth={2.2} />
      {label}
    </span>
  );
}

/* ─────────────── Módulo real: Alunos (Story 02) ─────────────── */

/**
 * Reproduz a gestão de Alunos do personal: busca, filtros (Todos/Novos/Sem
 * treino), métricas (Total/Ativos/Pendentes) e linhas com status Ativo/
 * Pendente, badge "Novo" e "N treinos"/"Sem treino" — fiel a /app/alunos.
 * Dimensionado para caber na área principal do <Desktop> do premium-ui.
 */
export function StudentsListMain() {
  const students = [
    { name: "Maria Santos", email: "maria@email.com", meta: "3 treinos · Desde 28 mai", status: "active", isNew: false, muted: false },
    { name: "Ana Lima", email: "ana@email.com", meta: "Novo aluno", status: "pending", isNew: true, muted: false },
    { name: "João Pereira", email: "joao@email.com", meta: "Sem treino", status: "active", isNew: false, muted: true },
    { name: "Carlos Souza", email: "carlos@email.com", meta: "2 treinos · Desde 12 jun", status: "active", isNew: false, muted: false },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f26a1b]">Alunos</p>
          <h3 className="mt-1.5 font-display text-[22px] font-semibold tracking-[-0.03em] text-white">
            Sua carteira
          </h3>
        </div>
        <div className="flex gap-2 text-center">
          {[
            { label: "Total", value: "8" },
            { label: "Ativos", value: "6" },
            { label: "Pendentes", value: "2" },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-1.5">
              <p className="font-display text-[17px] font-semibold text-white">{m.value}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-white/40">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Busca */}
      <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5">
        <Search size={15} className="text-white/35" />
        <span className="text-[12.5px] text-white/40">Buscar por nome ou e-mail</span>
      </div>

      {/* Filtros */}
      <div className="mt-3 flex gap-2">
        {[
          { label: "Todos", active: true },
          { label: "Novos", active: false },
          { label: "Sem treino", active: false },
        ].map((f) => (
          <span
            key={f.label}
            className={[
              "rounded-full px-3 py-1 text-[11px] font-semibold",
              f.active ? "bg-[#f26a1b]/14 text-[#f26a1b]" : "border border-white/8 bg-white/[0.02] text-white/50",
            ].join(" ")}
          >
            {f.label}
          </span>
        ))}
      </div>

      {/* Linhas */}
      <div className="mt-3 space-y-2">
        {students.map((s) => (
          <div key={s.name} className="flex items-center gap-3 rounded-xl border border-white/7 bg-[#111] px-3.5 py-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f26a1b]/14 text-[13px] font-semibold text-[#f26a1b]">
              {s.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[13.5px] font-semibold text-white">{s.name}</p>
                {s.isNew && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-[#f26a1b]/16 px-1.5 py-0.5 text-[9px] font-semibold text-[#f26a1b]">
                    <Sparkles size={8} /> Novo
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/45">
                <Dumbbell size={11} className={s.muted ? "text-white/30" : "text-white/45"} />
                <span className={s.muted ? "text-white/35" : ""}>{s.meta}</span>
              </div>
            </div>
            {s.status === "active" ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#22c55e]/12 px-2 py-1 text-[10.5px] font-semibold text-[#22c55e]">
                <UserCheck size={11} /> Ativo
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/[0.05] px-2 py-1 text-[10.5px] font-semibold text-white/50">
                <Clock size={11} /> Pendente
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/** Pill do link de convite real (movexfit.com.br/convite/…) com botão copiar. */
export function InvitePill({ scale = 1, className = "" }: { scale?: number; className?: string }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-[#121212]/95 p-3 backdrop-blur-md ${className}`}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "left center",
        boxShadow: "0 34px 80px -24px rgba(0,0,0,0.85), 0 18px 50px -30px rgba(242,106,27,0.55)",
      }}
    >
      <div className="min-w-0 rounded-xl border border-white/8 bg-black/40 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Link de convite</p>
        <p className="mt-1 font-mono text-[15px] text-white/80">movexfit.com.br/convite/kaue</p>
      </div>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f26a1b] text-white shadow-[0_14px_28px_rgba(242,106,27,0.35)]">
        <Check size={20} strokeWidth={2.6} />
      </span>
    </div>
  );
}

/** Card de convite recebido pelo aluno (visão do /convite). */
export function InviteReceivedCard({ scale = 1, tilt = "" }: { scale?: number; tilt?: string }) {
  return (
    <div style={{ transform: `${tilt} scale(${scale})`.trim(), transformOrigin: "center" }}>
      <div
        className="w-[380px] rounded-3xl border border-white/10 bg-[#101010] p-6 text-center"
        style={{ boxShadow: "0 50px 120px -34px rgba(0,0,0,0.85), 0 24px 70px -40px rgba(242,106,27,0.5)" }}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f26a1b]/14 text-xl font-bold text-[#f26a1b]">
          K
        </div>
        <h4 className="mt-4 font-display text-[19px] font-semibold leading-tight tracking-[-0.02em] text-white">
          Você foi convidado para treinar com <span className="text-[#f26a1b]">Kauê</span>
        </h4>
        <p className="mt-2 text-[13px] text-white/50">Kauê quer acompanhar seus treinos no MoveX Fit.</p>
        <div className="mt-5 rounded-xl bg-[#f26a1b] py-3 text-[14px] font-semibold text-white">
          Aceitar convite
        </div>
      </div>
    </div>
  );
}
