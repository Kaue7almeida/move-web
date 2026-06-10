import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, Check, Dumbbell, MessageCircle, Smartphone, Sparkles } from "lucide-react";

/**
 * Landing do Move.
 *
 * Posicionamento:
 * - Vende o produto (treino organizado, execucao guiada, evolucao, MoveScan,
 *   chat com IA e personal, notificacoes) — nao a tecnologia.
 * - Fala com os dois publicos: quem treina (aluno) e quem acompanha (personal).
 * - Acesso pelo celular aparece como conveniencia discreta, sem prometer
 *   app nativo nem presenca em lojas.
 *
 * Diretriz visual:
 * - Landing trava em dark (cores explicitas) — independente do toggle global.
 * - Restricao cromatica: um unico accent #f26a1b.
 * - Hierarquia conduzida por tipografia e whitespace, nao por decoracao.
 * - Mini-demos estaticas fieis aos modulos reais do app (sem backend).
 */

const ROUTE_SIGNUP = "/cadastro";
const ROUTE_LOGIN = "/entrar";

type ActionVariant = "primary" | "secondary" | "ghost";

type SectionEyebrowProps = {
  children: string;
};

type ProductCapability = {
  index: string;
  eyebrow: string;
  title: string;
  description: string;
};

const personalCapabilities: ProductCapability[] = [
  {
    index: "01",
    eyebrow: "Crie",
    title: "Monte treino do jeito que você prescreve.",
    description:
      "Escolha exercícios da galeria, defina séries, repetições e descanso. Salve como modelo para reutilizar.",
  },
  {
    index: "02",
    eyebrow: "Aplique",
    title: "Envie o treino com um link de convite.",
    description:
      "Seu aluno recebe o convite, cria a conta e o treino já aparece pronto para ele. Sem PDF, sem planilha.",
  },
  {
    index: "03",
    eyebrow: "Acompanhe",
    title: "Veja quem treinou e quem precisa de atenção.",
    description:
      "Sessões concluídas, frequência e última atividade de cada aluno, num painel só. Sem precisar perguntar.",
  },
];

const personalExtras = [
  "Converse com seus alunos no chat",
  "Configure a IA com a sua orientação",
  "Aluno avisado a cada treino aplicado",
];

const studentCapabilities: { title: string; description: string }[] = [
  {
    title: "Treino do dia pronto ao abrir.",
    description: "O treino aplicado pelo personal já aparece na tela inicial. Zero decisão no caminho.",
  },
  {
    title: "Execução guiada série por série.",
    description: "Reps, carga e descanso conduzidos um passo de cada vez, com registro de cada série.",
  },
  {
    title: "Histórico que vira evolução.",
    description: "Cada sessão concluída fica registrada. Você enxerga seu progresso semana a semana.",
  },
  {
    title: "MoveScan para acompanhar o corpo.",
    description: "Estimativa de composição corporal a partir de duas fotos. Acompanhe a mudança ao longo do tempo.",
  },
  {
    title: "Dúvidas respondidas na hora.",
    description: "Pergunte à IA, que conhece seu treino, ou fale direto com seu personal no chat.",
  },
  {
    title: "Notificações do que importa.",
    description: "Novo treino aplicado ou mensagem do personal: você fica sabendo na hora.",
  },
];

/* ─────────── Building blocks ─────────── */

function ActionLink({
  href,
  variant,
  children,
  className = "",
}: {
  href: string;
  variant: ActionVariant;
  children: ReactNode;
  className?: string;
}) {
  const variantClass =
    variant === "primary"
      ? "bg-[#f26a1b] text-white shadow-[0_18px_42px_rgba(242,106,27,0.32)] hover:bg-[#ff7d35]"
      : variant === "secondary"
        ? "border border-white/12 bg-white/[0.03] text-white hover:border-white/22 hover:bg-white/[0.06]"
        : "text-white/82 hover:text-white";

  return (
    <Link
      href={href}
      className={[
        "inline-flex h-11 items-center justify-center rounded-full px-5 text-[0.92rem] font-semibold tracking-[-0.01em] transition duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f26a1b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]",
        variantClass,
        className,
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function Eyebrow({ children }: SectionEyebrowProps) {
  return (
    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#f26a1b]">
      {children}
    </p>
  );
}

function SectionShell({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

/* ─────────── Mocks (contextual per section) ─────────── */

/**
 * Web panel mock — exibido no hero como referencia visual do acompanhamento.
 * Mostra a visao de "sessao executada" de um aluno, com series, reps e carga.
 */
function WebPanelMock() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#101010] shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
      {/* Top bar */}
      <div className="flex items-center gap-2 border-b border-white/6 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
        </div>
        <div className="ml-3 text-[0.7rem] font-medium text-white/40">move.app / alunos / maria</div>
      </div>

      {/* Header inside panel */}
      <div className="flex items-center justify-between gap-4 px-5 pt-5">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[#f26a1b]">
            Sessão concluída
          </p>
          <h4 className="mt-2 font-display text-xl font-semibold tracking-[-0.03em] text-white">
            Treino A — Maria Santos
          </h4>
          <p className="mt-1 text-[0.78rem] text-white/50">28 mai · 47 min · 18 séries</p>
        </div>
        <span className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/12 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#22c55e]">
          OK
        </span>
      </div>

      {/* Series table */}
      <div className="mt-5 grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-t border-white/5 px-5 py-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/40">
        <span>Exercício</span>
        <span>Série</span>
        <span>Reps</span>
        <span>Carga</span>
      </div>

      {[
        { ex: "Agachamento livre", set: "1/3", reps: "10", load: "60 kg" },
        { ex: "Agachamento livre", set: "2/3", reps: "10", load: "60 kg" },
        { ex: "Agachamento livre", set: "3/3", reps: "8", load: "55 kg" },
        { ex: "Desenvolvimento halter", set: "1/4", reps: "12", load: "14 kg" },
      ].map((row, idx) => (
        <div
          key={idx}
          className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-t border-white/5 px-5 py-3 text-[0.85rem]"
        >
          <span className="text-white/92">{row.ex}</span>
          <span className="text-white/50">{row.set}</span>
          <span className="font-semibold text-white">{row.reps}</span>
          <span className="font-semibold text-white">{row.load}</span>
        </div>
      ))}

      <div className="border-t border-white/5 px-5 py-3 text-[0.78rem] text-white/50">
        + 14 séries registradas
      </div>
    </div>
  );
}

/**
 * Phone mock — exibido no hero (parcial) e na secao do aluno (completo).
 * Mostra a tela de execucao guiada.
 */
function PhoneMock({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={[
        "relative mx-auto rounded-[2.4rem] border border-white/12 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-2.5 shadow-[0_30px_90px_rgba(0,0,0,0.55)]",
        compact ? "w-[16rem]" : "w-[18.5rem]",
      ].join(" ")}
    >
      {/* Notch */}
      <div className="absolute inset-x-0 top-2.5 z-10 flex justify-center">
        <div className="h-6 w-24 rounded-b-2xl bg-black/85" />
      </div>

      <div className="overflow-hidden rounded-[2rem] bg-[#0d0d0d] px-5 pb-5 pt-9">
        {/* Status row */}
        <div className="flex items-center justify-between text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white/45">
          <span>Treino A</span>
          <span>03 / 07</span>
        </div>

        {/* Exercise card */}
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#f26a1b]">
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

        {/* Rest timer */}
        <div className="mt-3 rounded-2xl border border-white/8 bg-[#0a0a0a] p-3.5">
          <div className="flex items-center justify-between text-[0.7rem] text-white/55">
            <span>Descanso</span>
            <span className="font-semibold text-white">01:12</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div className="h-full w-[58%] rounded-full bg-[#f26a1b]" />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-4 rounded-full bg-[#f26a1b] py-2.5 text-center text-[0.85rem] font-semibold text-white shadow-[0_14px_28px_rgba(242,106,27,0.28)]">
          Concluir série
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-2 py-2 text-center">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-1 text-base font-semibold tracking-[-0.02em] text-white">{value}</p>
    </div>
  );
}

function MockShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0d0d0d] p-3">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/45">{label}</p>
      {children}
    </div>
  );
}

/* ─────────── Mini mocks por capacidade (personal) ─────────── */

function CreateMock() {
  return (
    <MockShell label="Novo treino">
      <p className="mt-1.5 text-[0.92rem] font-semibold text-white">Treino A — Inferior</p>
      <div className="mt-3 space-y-1.5">
        {[
          { ex: "Agachamento livre", det: "3 x 8-10" },
          { ex: "Stiff", det: "4 x 10-12" },
          { ex: "Cadeira flexora", det: "3 x 12" },
        ].map((row) => (
          <div
            key={row.ex}
            className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5"
          >
            <span className="text-[0.78rem] text-white/85">{row.ex}</span>
            <span className="text-[0.7rem] text-white/45">{row.det}</span>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

function InviteMock() {
  return (
    <MockShell label="Convite">
      <p className="mt-1.5 text-[0.92rem] font-semibold text-white">Aplicar para Maria</p>
      <div className="mt-3 flex items-center gap-2 rounded-md border border-[#f26a1b]/24 bg-[#f26a1b]/8 px-2.5 py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-white/8 bg-white/[0.03] text-[0.72rem] font-semibold text-white">
          M
        </div>
        <div className="flex-1 text-[0.78rem] text-white/85">move.app/convite/kaue</div>
      </div>
      <div className="mt-3 rounded-full bg-[#f26a1b] py-1.5 text-center text-[0.78rem] font-semibold text-white">
        Enviar
      </div>
    </MockShell>
  );
}

/** Lista de alunos do personal: ultimo treino, frequencia e status. */
function StudentsMock() {
  return (
    <MockShell label="Seus alunos">
      <div className="mt-2.5 space-y-1.5">
        {[
          { name: "Maria", last: "Treino A · hoje", freq: "3x na semana", ok: true },
          { name: "João", last: "Treino C · há 4 dias", freq: "1x na semana", ok: false },
          { name: "Ana", last: "Treino B · ontem", freq: "4x na semana", ok: true },
        ].map((row) => (
          <div
            key={row.name}
            className="flex items-center gap-2.5 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-[0.72rem] font-semibold text-white">
              {row.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.78rem] font-semibold text-white/90">{row.name}</p>
              <p className="truncate text-[0.68rem] text-white/45">
                {row.last} · {row.freq}
              </p>
            </div>
            <span
              className={["h-2 w-2 shrink-0 rounded-full", row.ok ? "bg-[#22c55e]" : "bg-[#f26a1b]"].join(" ")}
            />
          </div>
        ))}
      </div>
    </MockShell>
  );
}

/* ─────────── Mini mocks por recurso ─────────── */

/** Treino do dia do aluno, com status por exercicio e CTA de inicio. */
function WorkoutDayMock() {
  return (
    <MockShell label="Treino de hoje">
      <p className="mt-1.5 text-[0.92rem] font-semibold text-white">Treino B — Superior</p>
      <div className="mt-3 space-y-1.5">
        {[
          { ex: "Supino reto com halteres", det: "3 x 10", done: true },
          { ex: "Remada curvada", det: "4 x 12", done: false },
          { ex: "Elevação lateral", det: "3 x 15", done: false },
        ].map((row) => (
          <div
            key={row.ex}
            className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5"
          >
            {row.done ? (
              <Check size={13} className="shrink-0 text-[#22c55e]" strokeWidth={2.4} />
            ) : (
              <span className="h-[13px] w-[13px] shrink-0 rounded-full border border-white/20" />
            )}
            <span className="flex-1 text-[0.78rem] text-white/85">{row.ex}</span>
            <span className="text-[0.7rem] text-white/45">{row.det}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-full bg-[#f26a1b] py-1.5 text-center text-[0.78rem] font-semibold text-white">
        Iniciar treino
      </div>
    </MockShell>
  );
}

/** Resultado ficticio de MoveScan, com disclaimer fiel ao produto. */
function ScanMock() {
  return (
    <MockShell label="MoveScan · Exemplo de resultado">
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="Gordura" value="22,4%" />
        <MiniStat label="M. magra" value="58 kg" />
        <MiniStat label="TMB" value="1.680" />
      </div>
      <p className="mt-3 text-[0.68rem] leading-4 text-white/40">
        Estimativa visual a partir de fotos. Não é diagnóstico clínico.
      </p>
    </MockShell>
  );
}

/** Troca curta com a IA contextual do chat. */
function ChatMock() {
  return (
    <MockShell label="Chat">
      <div className="mt-3 space-y-2">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[#f26a1b] px-3 py-2 text-[0.78rem] text-white">
          Me ajude a entender meu treino.
        </div>
        <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.03] px-3 py-2 text-[0.78rem] leading-5 text-white/85">
          Hoje o foco é inferior: agachamento e stiff concentram o volume. Capricha na técnica e
          respeite o descanso entre as séries.
        </div>
      </div>
      <p className="mt-2.5 flex items-center gap-1.5 text-[0.68rem] text-white/40">
        <Sparkles size={11} className="text-[#f26a1b]" />
        IA com contexto dos seus treinos
      </p>
    </MockShell>
  );
}

/** Ultimas sessoes registradas de um aluno (visao do personal). */
function SessionsMock() {
  return (
    <MockShell label="Últimas sessões">
      <div className="mt-2.5 space-y-1.5">
        {[
          { day: "Hoje", title: "Treino A · 18 séries", ok: true },
          { day: "Seg", title: "Treino B · parcial", ok: false },
          { day: "Sáb", title: "Treino A · 20 séries", ok: true },
        ].map((row) => (
          <div
            key={row.day}
            className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5"
          >
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/40">
                {row.day}
              </p>
              <p className="text-[0.78rem] text-white/85">{row.title}</p>
            </div>
            <span
              className={["h-2 w-2 rounded-full", row.ok ? "bg-[#22c55e]" : "bg-[#f26a1b]"].join(" ")}
            />
          </div>
        ))}
      </div>
    </MockShell>
  );
}

/** Central de notificacoes com badge e avisos reais do produto. */
function NotificationsMock() {
  return (
    <MockShell label="Notificações">
      <div className="mt-2.5 flex items-center justify-between">
        <div className="relative">
          <Bell size={17} className="text-white/70" strokeWidth={1.8} />
          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#f26a1b] text-[0.55rem] font-bold text-white">
            2
          </span>
        </div>
        <span className="text-[0.68rem] text-white/40">2 não lidas</span>
      </div>
      <div className="mt-3 space-y-1.5">
        {[
          {
            icon: Dumbbell,
            title: "Novo treino disponível",
            body: "Treino B aplicado pelo seu personal",
            when: "agora",
          },
          {
            icon: MessageCircle,
            title: "Nova mensagem",
            body: "Seu personal respondeu no chat",
            when: "2 h",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-2.5 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-2"
          >
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f26a1b]/12 text-[#f26a1b]">
              <item.icon size={12} strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.78rem] font-semibold text-white/90">{item.title}</p>
              <p className="truncate text-[0.68rem] text-white/45">{item.body}</p>
            </div>
            <span className="text-[0.62rem] text-white/35">{item.when}</span>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

const capabilityMockMap: Record<string, ReactNode> = {
  "01": <CreateMock />,
  "02": <InviteMock />,
  "03": <StudentsMock />,
};

type FeatureCard = {
  title: string;
  description: string;
  demo: ReactNode;
};

const featureCards: FeatureCard[] = [
  {
    title: "Treinos guiados",
    description: "O treino do dia chega pronto e a execução é conduzida série por série.",
    demo: <WorkoutDayMock />,
  },
  {
    title: "MoveScan",
    description: "Composição corporal estimada a partir de duas fotos, para acompanhar a evolução.",
    demo: <ScanMock />,
  },
  {
    title: "Chat com IA e personal",
    description: "A IA conhece seu contexto e responde na hora. O personal está na mesma conversa.",
    demo: <ChatMock />,
  },
  {
    title: "Acompanhamento",
    description: "O personal vê cada sessão executada: séries, carga, frequência e histórico.",
    demo: <SessionsMock />,
  },
  {
    title: "Notificações",
    description: "Novo treino aplicado, nova mensagem: avisos do que importa, sem ruído.",
    demo: <NotificationsMock />,
  },
];

/* ─────────── Page ─────────── */

export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="relative isolate overflow-hidden bg-[#0a0a0a] text-white">
      {/* Background glow + subtle grid */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[42rem] bg-[radial-gradient(circle_at_50%_0%,rgba(242,106,27,0.22),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 -z-30 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:96px_96px]" />

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-40 border-b border-white/6 bg-[#0a0a0a]/82 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="font-display text-xl font-semibold tracking-[-0.06em] text-white sm:text-2xl"
          >
            Move
          </Link>

          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="#recursos"
              className="hidden text-[0.85rem] font-medium text-white/65 transition hover:text-white sm:inline-flex sm:h-10 sm:items-center sm:px-3"
            >
              Recursos
            </Link>
            <ActionLink href={ROUTE_SIGNUP} variant="ghost" className="hidden sm:inline-flex">
              Criar conta
            </ActionLink>
            <ActionLink href={ROUTE_LOGIN} variant="primary">
              Entrar
            </ActionLink>
          </nav>
        </div>
      </header>

      <main>
        {/* ─── Hero ─── */}
        <section className="px-5 pb-24 pt-14 sm:px-6 sm:pb-32 sm:pt-20 lg:px-8 lg:pt-28">
          <div className="mx-auto w-full max-w-6xl">
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
              <div className="max-w-2xl">
                <Eyebrow>Para alunos e personal trainers</Eyebrow>

                <h1 className="text-balance mt-5 font-display text-[2.6rem] font-semibold leading-[0.95] tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
                  Treinos, evolução e acompanhamento em um só lugar.
                </h1>

                <p className="text-balance mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
                  Aluno treina com clareza, personal acompanha de perto e a IA ajuda a entender
                  treinos, resultados e próximos passos.
                </p>

                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <ActionLink href={ROUTE_LOGIN} variant="primary">
                    Entrar no Move
                  </ActionLink>
                  <ActionLink href="#recursos" variant="secondary">
                    Conhecer recursos
                  </ActionLink>
                </div>
              </div>

              {/* Composition mock: panel + phone */}
              <div className="relative">
                <div className="pointer-events-none absolute inset-0 -z-10 translate-x-6 translate-y-6 rounded-3xl bg-[radial-gradient(circle_at_30%_30%,rgba(242,106,27,0.20),transparent_60%)] blur-3xl" />
                <div className="relative">
                  <WebPanelMock />
                  <div className="absolute -bottom-12 -right-2 hidden sm:block sm:-bottom-16 sm:-right-6 lg:-right-10">
                    <PhoneMock compact />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Para quem treina ─── */}
        <SectionShell id="para-aluno">
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <div className="order-2 lg:order-1">
              <div className="relative">
                <div className="pointer-events-none absolute inset-0 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_50%_50%,rgba(242,106,27,0.16),transparent_60%)] blur-3xl" />
                <PhoneMock />
              </div>
            </div>

            <div className="order-1 max-w-xl lg:order-2">
              <Eyebrow>Para quem treina</Eyebrow>
              <h2 className="text-balance mt-5 font-display text-3xl font-semibold leading-[1.04] tracking-[-0.05em] text-white sm:text-4xl lg:text-[3rem]">
                Abra, treine e veja sua evolução acontecer.
              </h2>

              <div className="mt-10 space-y-7">
                {studentCapabilities.map((cap) => (
                  <div key={cap.title} className="flex gap-4">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f26a1b]" />
                    <div>
                      <h3 className="font-display text-[1.15rem] font-semibold tracking-[-0.02em] text-white">
                        {cap.title}
                      </h3>
                      <p className="mt-2 text-[0.95rem] leading-6 text-white/60">{cap.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionShell>

        {/* ─── Para quem acompanha ─── */}
        <SectionShell id="para-personal">
          <div className="max-w-2xl">
            <Eyebrow>Para quem acompanha</Eyebrow>
            <h2 className="text-balance mt-5 font-display text-3xl font-semibold leading-[1.04] tracking-[-0.05em] text-white sm:text-4xl lg:text-[3rem]">
              Crie, aplique e acompanhe sem perder o fio.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {personalCapabilities.map((cap) => (
              <article
                key={cap.index}
                className="group flex flex-col rounded-3xl border border-white/8 bg-white/[0.02] p-6 transition duration-200 hover:-translate-y-1 hover:border-white/16 hover:bg-white/[0.035]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#f26a1b]">
                    {cap.eyebrow}
                  </span>
                  <span className="font-display text-sm font-semibold text-white/35">{cap.index}</span>
                </div>

                <h3 className="text-balance mt-5 font-display text-[1.4rem] font-semibold leading-[1.15] tracking-[-0.03em] text-white">
                  {cap.title}
                </h3>

                <p className="mt-3 text-[0.95rem] leading-6 text-white/60">{cap.description}</p>

                <div className="mt-auto pt-7">{capabilityMockMap[cap.index]}</div>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            {personalExtras.map((extra) => (
              <div key={extra} className="flex items-center gap-2.5">
                <Check size={15} className="shrink-0 text-[#f26a1b]" strokeWidth={2.4} />
                <span className="text-[0.9rem] text-white/70">{extra}</span>
              </div>
            ))}
          </div>
        </SectionShell>

        {/* ─── Recursos ─── */}
        <SectionShell id="recursos">
          <div className="max-w-2xl">
            <Eyebrow>Recursos</Eyebrow>
            <h2 className="text-balance mt-5 font-display text-3xl font-semibold leading-[1.04] tracking-[-0.05em] text-white sm:text-4xl lg:text-[3rem]">
              O essencial para treinar e acompanhar bem.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((card) => (
              <article
                key={card.title}
                className="flex flex-col rounded-3xl border border-white/8 bg-white/[0.02] p-6 transition duration-200 hover:-translate-y-1 hover:border-white/16 hover:bg-white/[0.035]"
              >
                <h3 className="font-display text-[1.25rem] font-semibold tracking-[-0.03em] text-white">
                  {card.title}
                </h3>
                <p className="mt-3 text-[0.95rem] leading-6 text-white/60">{card.description}</p>
                <div className="mt-auto pt-6">{card.demo}</div>
              </article>
            ))}
          </div>
        </SectionShell>

        {/* ─── Acesso rápido no celular (discreto) ─── */}
        <section className="px-5 pb-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mx-auto flex max-w-3xl items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.02] px-6 py-5">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f26a1b]/12 text-[#f26a1b]">
                <Smartphone size={17} strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="font-display text-[1.05rem] font-semibold tracking-[-0.02em] text-white">
                  Use também pelo celular
                </h2>
                <p className="mt-1.5 text-[0.9rem] leading-6 text-white/55">
                  Entre pelo navegador e, se quiser, adicione o Move à tela inicial para abrir
                  direto pelo ícone.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA final ─── */}
        <SectionShell id="cta-final">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[#0d0d0d] px-6 py-14 text-center sm:px-10 sm:py-20">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(242,106,27,0.22),transparent_70%)]" />

            <div className="relative">
              <Eyebrow>Comece</Eyebrow>
              <h2 className="text-balance mx-auto mt-5 max-w-3xl font-display text-3xl font-semibold leading-[1.04] tracking-[-0.05em] text-white sm:text-4xl lg:text-[3.2rem]">
                Entre e veja seu treino de hoje.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
                Aluno entra e treina com clareza. Personal cria a conta, monta o primeiro treino e
                convida o aluno em minutos.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ActionLink href={ROUTE_LOGIN} variant="primary">
                  Entrar no Move
                </ActionLink>
                <ActionLink href={ROUTE_SIGNUP} variant="secondary">
                  Criar conta
                </ActionLink>
              </div>

              <Link
                href={ROUTE_LOGIN}
                className="mt-6 inline-block text-[0.88rem] font-medium text-white/55 transition hover:text-white"
              >
                Recebi um convite do meu personal →
              </Link>
            </div>
          </div>
        </SectionShell>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/6 px-5 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-display text-xl font-semibold tracking-[-0.06em] text-white">Move</p>
            <p className="mt-2 text-[0.88rem] text-white/45">
              Treinos, evolução e acompanhamento em um só lugar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-[0.85rem] text-white/45">
            <Link href="/termos" className="transition hover:text-white">
              Termos
            </Link>
            <Link href="/privacidade" className="transition hover:text-white">
              Privacidade
            </Link>
            <span>© {currentYear} Move</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
