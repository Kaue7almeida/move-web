import type { ComponentType, CSSProperties, ReactNode } from "react";
import {
  Activity,
  Check,
  ChevronRight,
  Dumbbell,
  FolderOpen,
  Home,
  MessageCircle,
  Sparkles,
  User,
  Users,
} from "lucide-react";

/**
 * Sistema visual "premium" do kit de marketing — MoveX Fit (rodada 2).
 *
 * Objetivo desta rodada: peças mais publicitárias e autorais, sem virar
 * print cru nem cópia da landing. Recursos:
 * - fundo dark com mesh de glows laranja + grão sutil (mais atmosfera);
 * - device frames com leve perspectiva, rim light e sombra profunda;
 * - "recortes" de UI flutuando sobre os devices (destaques);
 * - números-herói e headlines fortes.
 *
 * Fidelidade: telas, textos, métricas e navegação reproduzem o app real
 * (execução guiada, Acompanhamento, Studio de Treinos, MoveScan, Chat Move).
 * Nada aqui inventa feature — só reinterpreta visualmente o que já existe.
 *
 * Tudo em pixel fixo para export headless em PNG (sem responsividade).
 */

type IconComponent = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

const ACCENT = "#f26a1b";

/* ─────────────── Canvas + atmosfera ─────────────── */

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
      className="relative isolate overflow-hidden bg-[#080808] text-white"
      style={{ width, height }}
    >
      {/* Grão sutil */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] mix-blend-screen"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Grid fino */}
      <div className="pointer-events-none absolute inset-0 -z-20 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:132px_132px]" />
      {/* Vinheta */}
      <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(120%_120%_at_50%_-10%,transparent_55%,rgba(0,0,0,0.6)_100%)]" />
      {children}
    </div>
  );
}

/** Glow radial laranja — posicionar via className (absolute + tamanho). */
export function Glow({
  className = "",
  intensity = 0.22,
}: {
  className?: string;
  intensity?: number;
}) {
  return (
    <div
      className={`pointer-events-none absolute -z-10 rounded-full ${className}`}
      style={{
        background: `radial-gradient(circle, rgba(242,106,27,${intensity}), transparent 66%)`,
      }}
    />
  );
}

/* ─────────────── Marca + tipografia ─────────────── */

export function Wordmark({ size = 44 }: { size?: number }) {
  return (
    <div className="flex items-center gap-[0.5em]" style={{ fontSize: size }}>
      <span
        className="flex items-center justify-center rounded-[0.32em] bg-[#f26a1b] font-display font-bold text-white"
        style={{ width: "1.2em", height: "1.2em", fontSize: "0.82em" }}
      >
        M
      </span>
      <p className="font-display font-semibold leading-none tracking-[-0.04em] text-white">
        MoveX <span className="text-[#f26a1b]">Fit</span>
      </p>
    </div>
  );
}

export function Kicker({
  size = 21,
  children,
}: {
  size?: number;
  children: string;
}) {
  return (
    <div className="flex items-center gap-[0.7em]" style={{ fontSize: size }}>
      <span className="h-px w-[2.2em] bg-[#f26a1b]" />
      <span className="font-semibold uppercase tracking-[0.28em] text-[#f26a1b]">
        {children}
      </span>
    </div>
  );
}

export function Headline({
  size,
  children,
  className = "",
  style,
}: {
  size: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <h1
      className={`font-display font-semibold leading-[0.95] tracking-[-0.045em] text-white ${className}`}
      style={{ fontSize: size, ...style }}
    >
      {children}
    </h1>
  );
}

/** Palavra com traço/realce laranja por baixo. */
export function Mark({ children }: { children: ReactNode }) {
  return (
    <span className="relative whitespace-nowrap text-[#f26a1b]">
      {children}
    </span>
  );
}

export function Lead({
  size = 26,
  width,
  children,
}: {
  size?: number;
  width?: number;
  children: ReactNode;
}) {
  return (
    <p
      className="leading-[1.45] text-white/60"
      style={{ fontSize: size, width }}
    >
      {children}
    </p>
  );
}

export function DomainPill({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center gap-[0.55em] rounded-full bg-[#f26a1b] font-semibold tracking-[-0.01em] text-white shadow-[0_20px_46px_rgba(242,106,27,0.4)]"
      style={{ fontSize: size, padding: `${size * 0.62}px ${size * 1.2}px` }}
    >
      <span
        className="rounded-full bg-white/85"
        style={{ width: size * 0.34, height: size * 0.34 }}
      />
      movexfit.com.br
    </span>
  );
}

export function FeatureChip({
  icon: Icon,
  label,
  size = 23,
}: {
  icon: IconComponent;
  label: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex items-center gap-[0.55em] whitespace-nowrap rounded-full border border-white/12 bg-white/[0.045] font-medium text-white/85 backdrop-blur-sm"
      style={{ fontSize: size, padding: `${size * 0.5}px ${size * 0.95}px` }}
    >
      <Icon size={size * 1.05} strokeWidth={2} className="shrink-0 text-[#f26a1b]" />
      {label}
    </span>
  );
}

export function BenefitRow({
  size = 25,
  children,
}: {
  size?: number;
  children: string;
}) {
  return (
    <div className="flex items-center gap-[0.6em]" style={{ fontSize: size }}>
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-[#f26a1b]/16 text-[#f26a1b]"
        style={{ width: size * 1.4, height: size * 1.4 }}
      >
        <Check size={size * 0.78} strokeWidth={2.6} />
      </span>
      <span className="font-medium text-white/85">{children}</span>
    </div>
  );
}

/** Tag flutuante que rotula um device (ex.: "Aluno", "Personal"). */
export function DeviceTag({
  size = 18,
  children,
  className = "",
}: {
  size?: number;
  children: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[0.5em] rounded-full border border-white/14 bg-black/60 font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur ${className}`}
      style={{ fontSize: size, padding: `${size * 0.5}px ${size * 0.9}px` }}
    >
      <span className="h-[0.5em] w-[0.5em] rounded-full bg-[#f26a1b]" />
      {children}
    </span>
  );
}

/* ─────────────── Número-herói + destaques ─────────────── */

export function HeroStat({
  value,
  unit,
  label,
  size = 150,
}: {
  value: string;
  unit?: string;
  label?: string;
  size?: number;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-start" style={{ lineHeight: 0.9 }}>
        <span
          className="font-display font-semibold tracking-[-0.05em] text-white"
          style={{ fontSize: size }}
        >
          {value}
        </span>
        {unit && (
          <span
            className="mt-[0.18em] font-display font-semibold tracking-[-0.03em] text-[#f26a1b]"
            style={{ fontSize: size * 0.34 }}
          >
            {unit}
          </span>
        )}
      </div>
      {label && (
        <span
          className="mt-[0.4em] font-medium uppercase tracking-[0.2em] text-white/50"
          style={{ fontSize: size * 0.13 }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/** Cartão de destaque flutuante (recorte de UI) com elevação + rim laranja. */
export function FloatingCard({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#121212]/95 backdrop-blur-md ${className}`}
      style={{
        boxShadow:
          "0 34px 80px -24px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04), 0 18px 50px -30px rgba(242,106,27,0.55)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Toast de notificação real do produto. */
export function NotifToast({
  icon: Icon = Dumbbell,
  title = "Novo treino disponível",
  body = "Treino B aplicado pelo seu personal",
  when = "agora",
  width = 340,
}: {
  icon?: IconComponent;
  title?: string;
  body?: string;
  when?: string;
  width?: number;
}) {
  return (
    <FloatingCard style={{ width }} className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f26a1b]/14 text-[#f26a1b]">
          <Icon size={17} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-white">{title}</p>
          <p className="mt-0.5 truncate text-[12px] text-white/55">{body}</p>
        </div>
        <span className="text-[11px] text-white/35">{when}</span>
      </div>
    </FloatingCard>
  );
}

/* ─────────────── Device: Phone ─────────────── */

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-2 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
        {label}
      </p>
      <p className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-white">{value}</p>
    </div>
  );
}

export function Phone({
  children,
  scale = 1,
  tilt = "",
  style,
}: {
  children: ReactNode;
  scale?: number;
  tilt?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        transform: `${tilt} scale(${scale})`.trim(),
        transformOrigin: "center",
        ...style,
      }}
    >
      <div
        className="relative w-[320px] rounded-[46px] border border-white/12 bg-gradient-to-b from-white/[0.12] to-white/[0.02] p-[11px]"
        style={{
          boxShadow:
            "0 60px 130px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05), 0 40px 90px -50px rgba(242,106,27,0.5)",
        }}
      >
        {/* Rim light lateral */}
        <div className="pointer-events-none absolute inset-y-10 -left-px w-px rounded-full bg-gradient-to-b from-transparent via-white/25 to-transparent" />
        <div className="absolute inset-x-0 top-[11px] z-10 flex justify-center">
          <div className="h-[26px] w-[104px] rounded-b-[18px] bg-black/85" />
        </div>
        <div className="overflow-hidden rounded-[36px] bg-[#0b0b0b] px-5 pb-6 pt-11">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Tela de execução guiada (aluno). */
export function ExecutionScreen() {
  return (
    <>
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
        <span>Treino A · Superior</span>
        <span>03 / 07</span>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f26a1b]">
          Em execução
        </p>
        <h5 className="mt-2 font-display text-[19px] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
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

      <div className="mt-4 rounded-full bg-[#f26a1b] py-3 text-center text-[14px] font-semibold text-white shadow-[0_16px_32px_rgba(242,106,27,0.3)]">
        Concluir série
      </div>
    </>
  );
}

/** Tela de treino do dia (aluno). */
export function TodayScreen() {
  const exercises = [
    { ex: "Supino reto com halteres", det: "3 x 10", done: true },
    { ex: "Desenvolvimento halter", det: "3 x 10", done: true },
    { ex: "Remada curvada", det: "4 x 12", done: false },
    { ex: "Elevação lateral", det: "3 x 15", done: false },
  ];
  return (
    <>
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
        <span>Treino de hoje</span>
        <span>4 exercícios</span>
      </div>
      <h5 className="mt-3 font-display text-[19px] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
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
      <div className="mt-4 rounded-full bg-[#f26a1b] py-3 text-center text-[14px] font-semibold text-white shadow-[0_16px_32px_rgba(242,106,27,0.3)]">
        Iniciar treino
      </div>
    </>
  );
}

/** Tela de histórico de sessões (aluno). */
export function HistoryScreen() {
  const rows = [
    { day: "Hoje", title: "Treino A · 18 séries", ok: true },
    { day: "Seg", title: "Treino B · 16 séries", ok: true },
    { day: "Sáb", title: "Treino A · 20 séries", ok: true },
    { day: "Qui", title: "Treino C · parcial", ok: false },
  ];
  return (
    <>
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
        <span>Histórico</span>
        <span>Este mês</span>
      </div>
      <div className="mt-3 flex items-end gap-1.5">
        <span className="font-display text-[34px] font-semibold leading-none tracking-[-0.04em] text-white">
          14
        </span>
        <span className="mb-1 text-[12px] text-white/50">treinos concluídos</span>
      </div>
      <div className="mt-4 space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.day}
            className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                {row.day}
              </p>
              <p className="text-[12px] text-white/85">{row.title}</p>
            </div>
            <span
              className={["h-2 w-2 rounded-full", row.ok ? "bg-[#22c55e]" : "bg-[#f26a1b]"].join(
                " ",
              )}
            />
          </div>
        ))}
      </div>
    </>
  );
}

/** Tela de chat com IA Move (aluno). */
export function ChatScreen() {
  return (
    <>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
        <Sparkles size={12} className="text-[#f26a1b]" />
        <span>IA Move</span>
      </div>
      <div className="mt-4 space-y-2.5">
        <div className="ml-auto w-fit max-w-[86%] rounded-2xl rounded-br-md bg-[#f26a1b] px-3 py-2 text-[12.5px] leading-snug text-white">
          Por que meu treino de hoje é superior?
        </div>
        <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[12.5px] leading-[1.5] text-white/85">
          Hoje é dia de empurrar: peito, ombro e tríceps. Comece pelo supino, controle a descida
          e respeite o descanso de 60s entre as séries.
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.02] px-3 py-2.5">
        <span className="flex-1 text-[12px] text-white/40">Escreva sua mensagem...</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f26a1b] text-white">
          <ChevronRight size={15} strokeWidth={2.4} />
        </span>
      </div>
    </>
  );
}

/** Tela de resultado do MoveScan (aluno). */
export function ScanScreen() {
  return (
    <>
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
        <span>MoveScan</span>
        <span>08 jul</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat label="Gordura" value="22,4%" />
        <MiniStat label="Massa magra" value="58 kg" />
        <MiniStat label="IMC" value="24,1" />
        <MiniStat label="TMB" value="1.680" />
      </div>
      <div className="mt-3 rounded-2xl border border-white/8 bg-[#0a0a0a] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
          vs. scan anterior
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/12 px-2.5 py-1 text-[11px] font-semibold text-[#22c55e]">
            Gordura −1,2 p.p.
          </span>
          <span className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/12 px-2.5 py-1 text-[11px] font-semibold text-[#22c55e]">
            Magra +0,8 kg
          </span>
        </div>
      </div>
      <p className="mt-3 text-[9.5px] leading-3 text-white/35">
        Estimativa a partir de fotos. Não é diagnóstico clínico.
      </p>
    </>
  );
}

/* ─────────────── Device: Desktop (app do personal) ─────────────── */

const TRAINER_NAV: { label: string; icon: IconComponent; active?: boolean }[] = [
  { label: "Início", icon: Home },
  { label: "Alunos", icon: Users },
  { label: "Treinos", icon: Dumbbell },
  { label: "Chat Move", icon: MessageCircle },
  { label: "Galeria", icon: FolderOpen },
  { label: "Acompanhamento", icon: Activity },
  { label: "Perfil", icon: User },
];

export function Desktop({
  children,
  active,
  scale = 1,
  tilt = "",
  style,
}: {
  children: ReactNode;
  active: string;
  scale?: number;
  tilt?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        transform: `${tilt} scale(${scale})`.trim(),
        transformOrigin: "center",
        ...style,
      }}
    >
      <div
        className="w-[760px] overflow-hidden rounded-[20px] border border-white/10 bg-[#0d0d0d]"
        style={{
          boxShadow:
            "0 70px 150px -40px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05), 0 40px 120px -60px rgba(242,106,27,0.45)",
        }}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-white/6 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
          </div>
          <div className="ml-3 flex-1 rounded-md bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/40">
            movexfit.com.br/app
          </div>
        </div>

        <div className="flex h-[440px]">
          {/* Sidebar */}
          <aside className="w-[186px] shrink-0 border-r border-white/6 bg-[#0a0a0a] px-3.5 py-4">
            <div className="flex items-center gap-2 px-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f26a1b] font-display text-[13px] font-bold text-white">
                M
              </span>
              <span className="font-display text-[15px] font-semibold tracking-[-0.03em] text-white">
                MoveX <span className="text-[#f26a1b]">Fit</span>
              </span>
            </div>
            <nav className="mt-5 space-y-0.5">
              {TRAINER_NAV.map((item) => {
                const isActive = item.label === active;
                return (
                  <div
                    key={item.label}
                    className={[
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium",
                      isActive
                        ? "bg-[#f26a1b]/12 text-[#f26a1b]"
                        : "text-white/55",
                    ].join(" ")}
                  >
                    <item.icon size={15} strokeWidth={1.9} />
                    {item.label}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Main */}
          <div className="flex-1 overflow-hidden bg-[#0d0d0d] px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Main: Acompanhamento — atividade dos alunos (personal). */
export function TrackingMain() {
  const students = [
    { name: "Maria Santos", last: "Treino A · 28 mai", done: 12, week: 5, ok: true },
    { name: "João Pereira", last: "Treino C · há 4 dias", done: 7, week: 1, ok: false },
    { name: "Ana Lima", last: "Treino B · ontem", done: 15, week: 4, ok: true },
  ];
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f26a1b]">
            Acompanhamento
          </p>
          <h3 className="mt-1.5 font-display text-[22px] font-semibold tracking-[-0.03em] text-white">
            Quem treinou esta semana
          </h3>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[
          { label: "Alunos", value: "8" },
          { label: "Ativos", value: "6" },
          { label: "Sessões · 7d", value: "23" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
              {m.label}
            </p>
            <p className="mt-1 font-display text-[24px] font-semibold tracking-[-0.03em] text-white">
              {m.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {students.map((s) => (
          <div
            key={s.name}
            className="flex items-center gap-3 rounded-xl border border-white/7 bg-[#111] px-3.5 py-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[13px] font-semibold text-white/70">
              {s.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-white">{s.name}</p>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/45">
                <span>Último: {s.last}</span>
                <span className="text-white/15">·</span>
                <span>{s.done} concluídos</span>
                {s.week > 0 && (
                  <>
                    <span className="text-white/15">·</span>
                    <span className="font-medium text-[#22c55e]">{s.week} nos últimos 7 dias</span>
                  </>
                )}
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[#f26a1b]">
              Ver atividade
              <ChevronRight size={14} />
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/** Main: Studio de Treinos — montagem de treino (personal). */
export function StudioMain() {
  const rows = [
    { ex: "Agachamento livre", muscle: "Quadríceps", eq: "Barra", sets: "4", reps: "8-10" },
    { ex: "Leg press 45°", muscle: "Quadríceps", eq: "Máquina", sets: "3", reps: "12" },
    { ex: "Stiff", muscle: "Posteriores", eq: "Barra", sets: "4", reps: "10-12" },
    { ex: "Cadeira flexora", muscle: "Posteriores", eq: "Máquina", sets: "3", reps: "12" },
  ];
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f26a1b]">
            Novo treino
          </p>
          <h3 className="mt-1.5 font-display text-[22px] font-semibold tracking-[-0.03em] text-white">
            Treino C — Inferior
          </h3>
        </div>
        <span className="rounded-md bg-[#22c55e]/12 px-2.5 py-1 text-[11px] font-semibold text-[#22c55e]">
          Ativo
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        {["4 exercícios", "14 séries", "Quadríceps", "Posteriores"].map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-white/8 bg-white/[0.02] px-2.5 py-1 text-[10.5px] font-medium text-white/55"
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {rows.map((r, i) => (
          <div
            key={r.ex}
            className="flex items-center gap-3 rounded-xl border border-white/7 bg-[#111] px-3 py-2.5"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
              <Dumbbell size={17} className="text-white/35" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">
                <span className="mr-1.5 text-white/30">{i + 1}</span>
                {r.ex}
              </p>
              <div className="mt-1 flex gap-1.5">
                <span className="rounded border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white/50">
                  {r.muscle}
                </span>
                <span className="rounded border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white/50">
                  {r.eq}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 text-center">
              <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-white/40">Séries</p>
                <p className="text-[13px] font-semibold text-white">{r.sets}</p>
              </div>
              <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-white/40">Reps</p>
                <p className="text-[13px] font-semibold text-white">{r.reps}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Main: Sessão concluída de um aluno (personal). */
export function SessionMain() {
  const rows = [
    { ex: "Agachamento livre", set: "1/4", reps: "10", load: "60 kg" },
    { ex: "Agachamento livre", set: "2/4", reps: "10", load: "60 kg" },
    { ex: "Agachamento livre", set: "3/4", reps: "8", load: "65 kg" },
    { ex: "Stiff", set: "1/4", reps: "12", load: "40 kg" },
  ];
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f26a1b]">
            Sessão concluída
          </p>
          <h3 className="mt-1.5 font-display text-[22px] font-semibold tracking-[-0.03em] text-white">
            Treino A — Maria Santos
          </h3>
          <p className="mt-1 text-[12px] text-white/50">28 mai · 47 min · 18 séries</p>
        </div>
        <span className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#22c55e]">
          OK
        </span>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_auto_auto] gap-x-5 border-t border-white/6 px-1 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
        <span>Exercício</span>
        <span>Série</span>
        <span>Reps</span>
        <span>Carga</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_auto_auto_auto] gap-x-5 border-t border-white/5 px-1 py-2.5 text-[13px]"
        >
          <span className="text-white/90">{r.ex}</span>
          <span className="text-white/45">{r.set}</span>
          <span className="font-semibold text-white">{r.reps}</span>
          <span className="font-semibold text-white">{r.load}</span>
        </div>
      ))}
      <div className="border-t border-white/5 px-1 py-2.5 text-[12px] text-white/45">
        + 14 séries registradas
      </div>
    </>
  );
}

/** Cartão de resultado do MoveScan em tamanho grande (para peça de feature). */
export function ScanResultCard({ scale = 1, tilt = "" }: { scale?: number; tilt?: string }) {
  const metrics = [
    { label: "Gordura corporal", value: "22,4", unit: "%" },
    { label: "Massa magra", value: "58,2", unit: "kg" },
    { label: "IMC", value: "24,1", unit: "" },
    { label: "TMB", value: "1.680", unit: "kcal" },
  ];
  return (
    <div style={{ transform: `${tilt} scale(${scale})`.trim(), transformOrigin: "center" }}>
      <div
        className="w-[420px] rounded-3xl border border-white/10 bg-[#101010] p-6"
        style={{
          boxShadow:
            "0 60px 130px -34px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05), 0 30px 90px -50px rgba(242,106,27,0.5)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f26a1b]">
              MoveScan · resultado
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
            <div key={m.label} className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                {m.label}
              </p>
              <p className="mt-1.5 font-display text-[26px] font-semibold tracking-[-0.03em] text-white">
                {m.value}
                {m.unit && <span className="ml-1 text-[14px] font-medium text-white/50">{m.unit}</span>}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-4 text-white/40">
          Estimativa visual a partir de fotos. Não é diagnóstico clínico.
        </p>
      </div>
    </div>
  );
}

export { ACCENT };
