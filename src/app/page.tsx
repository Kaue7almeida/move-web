import Link from "next/link";
import type { ReactNode } from "react";

type ActionLinkVariant = "primary" | "secondary" | "ghost";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

const signalPoints = [
  "Personal ou solo",
  "Treino do dia claro",
  "Execução guiada",
] as const;

const howItWorksSteps = [
  {
    index: "01",
    title: "Crie sua conta",
    description: "Conte para o Move quem você é e como treina.",
  },
  {
    index: "02",
    title: "Receba seu programa",
    description: "Tenha treinos organizados para sua rotina.",
  },
  {
    index: "03",
    title: "Treine com orientação",
    description: "Execute, registre e evolua com clareza.",
  },
] as const;

const testimonials = [
  {
    quote:
      "Antes eu improvisava cada treino. Agora eu abro o app e sei exatamente o que fazer.",
    author: "Aluno beta",
    role: "Depoimento ilustrativo do MVP",
  },
  {
    quote:
      "Para acompanhar aluno de perto, eu precisava de menos fricção e mais contexto. O Move organiza isso.",
    author: "Personal parceiro",
    role: "Depoimento ilustrativo do MVP",
  },
] as const;

function ActionLink({
  href,
  variant,
  children,
}: {
  href: string;
  variant: ActionLinkVariant;
  children: ReactNode;
}) {
  const variantClassName =
    variant === "primary"
      ? "bg-accent text-white shadow-[0_20px_45px_rgba(255,107,43,0.34)] hover:bg-[#ff7d45]"
      : variant === "secondary"
        ? "border border-white/12 bg-white/[0.03] text-white hover:border-[#FF6B2B]/60 hover:bg-[#FF6B2B]/10"
        : "border border-white/12 bg-white/[0.02] text-white hover:border-white/20 hover:bg-white/[0.06]";

  return (
    <Link
      href={href}
      className={[
        "inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold tracking-[-0.02em] transition duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B2B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D0D]",
        variantClassName,
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">{eyebrow}</p>
      <h2 className="text-balance mt-4 font-display text-3xl font-semibold tracking-[-0.06em] text-white sm:text-4xl md:text-[3rem] md:leading-[1.02]">
        {title}
      </h2>
      {description ? (
        <p className="text-balance mt-4 text-base leading-7 text-muted sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="device-shell relative mx-auto w-full max-w-[23rem] rounded-[2.75rem] p-3">
      <div className="absolute inset-x-0 top-3 flex justify-center">
        <div className="h-7 w-28 rounded-b-[1.1rem] bg-black/70" />
      </div>
      <div className="device-screen overflow-hidden rounded-[2.3rem] p-5 pt-10">{children}</div>
    </div>
  );
}

function MetricPill({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/82">
      {children}
    </div>
  );
}

function HeroPhoneMock() {
  return (
    <PhoneFrame>
      <div className="space-y-4">
        <div className="flex items-center justify-between text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-muted">
          <span>Move</span>
          <span>Hoje</span>
        </div>

        <div className="surface-panel rounded-[1.75rem] p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="rounded-full border border-[#FF6B2B]/30 bg-[#FF6B2B]/12 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-accent">
              Treino do dia
            </span>
            <span className="text-sm font-medium text-muted">52 min</span>
          </div>

          <h3 className="text-balance mt-5 font-display text-[2rem] font-semibold leading-[0.95] tracking-[-0.05em] text-white">
            Treino A
            <br />
            Peito + tríceps
          </h3>

          <p className="mt-4 text-sm leading-6 text-muted">
            7 exercícios organizados, descanso guiado e registro da sessão no mesmo fluxo.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <MetricPill>7 exercícios</MetricPill>
            <MetricPill>3 blocos</MetricPill>
            <MetricPill>Semana 2/6</MetricPill>
          </div>

          <div className="mt-6 rounded-full bg-accent px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_18px_30px_rgba(255,107,43,0.28)]">
            Iniciar treino
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-3.5">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-muted">Progresso</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">68%</p>
            <div className="mt-3 h-2 rounded-full bg-white/7">
              <div className="h-full w-[68%] rounded-full bg-accent" />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-3.5">
            <p className="text-[0.72rem] uppercase tracking-[0.18em] text-muted">Próximo</p>
            <p className="mt-3 text-sm font-semibold leading-5 text-white">Costas + bíceps</p>
            <p className="mt-2 text-xs text-muted">Sexta, 18:00</p>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[38rem] bg-[radial-gradient(circle_at_top,rgba(255,107,43,0.28),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 -z-30 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:96px_96px]" />

      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0D0D0D]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="font-display text-2xl font-semibold tracking-[-0.08em] text-white"
          >
            Move
          </Link>
          <ActionLink href="#final-cta" variant="ghost">
            Entrar
          </ActionLink>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white/82">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Treino feito para você
              </div>

              <h1 className="text-balance mt-6 font-display text-5xl font-semibold leading-[0.92] tracking-[-0.08em] text-white sm:text-6xl lg:text-7xl">
                Treino personalizado. Do jeito que você precisa.
              </h1>

              <p className="text-balance mt-6 max-w-lg text-base leading-7 text-muted sm:text-lg">
                O Move organiza, prescreve e acompanha seu treino com personal ou sem. Você só
                precisa aparecer.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ActionLink href="#final-cta" variant="primary">
                  Começar agora
                </ActionLink>
                <ActionLink href="#how-it-works" variant="secondary">
                  Ver como funciona
                </ActionLink>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {signalPoints.map((point) => (
                  <div
                    key={point}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm font-medium text-white/88 backdrop-blur"
                  >
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-8 rounded-full bg-accent/15 blur-3xl" />
              <div className="absolute -right-2 top-8 hidden w-40 rounded-[1.6rem] border border-[#FF6B2B]/20 bg-[#18120f]/88 p-4 shadow-[0_22px_60px_rgba(0,0,0,0.35)] md:block">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-accent">Hoje</p>
                <p className="mt-3 text-sm font-semibold leading-5 text-white">
                  Direção clara para treinar sem improviso.
                </p>
              </div>
              <div className="absolute -left-3 bottom-8 hidden max-w-[12rem] rounded-[1.6rem] border border-white/10 bg-black/55 p-4 shadow-[0_22px_60px_rgba(0,0,0,0.38)] backdrop-blur sm:block">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted">
                  Experiência Move
                </p>
                <p className="mt-3 text-sm font-semibold leading-5 text-white">
                  Prescrição, execução e evolução no mesmo lugar.
                </p>
              </div>
              <HeroPhoneMock />
            </div>
          </div>
        </section>

        <section className="bg-surface/70 py-8 sm:py-10">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8">
            <div className="surface-panel rounded-[2rem] px-6 py-10 sm:px-10 sm:py-12">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Problema</p>
              <h2 className="text-balance mt-4 max-w-4xl font-display text-3xl font-semibold leading-[1.06] tracking-[-0.06em] text-white sm:text-4xl lg:text-[3.35rem]">
                A maioria das pessoas não precisa de mais exercícios. Precisa de direção.
              </h2>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-28 py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Como funciona"
              title="O Move organiza o treino do início ao registro final."
              description="Um fluxo simples para colocar clareza onde hoje existe improviso."
              align="center"
            />

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {howItWorksSteps.map((step) => (
                <article
                  key={step.index}
                  className="surface-panel rounded-[2rem] p-6 transition duration-200 hover:-translate-y-1 hover:border-[#FF6B2B]/30"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FF6B2B]/25 bg-[#FF6B2B]/10 text-sm font-semibold text-accent">
                      {step.index}
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#FF6B2B]/40 to-transparent" />
                  </div>
                  <h3 className="mt-8 font-display text-2xl font-semibold tracking-[-0.05em] text-white">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-muted">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="product" className="scroll-mt-28 py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Produto em tela"
              title="Veja o Move na prática."
              description="Três momentos do produto para mostrar como a experiência acontece no dia a dia."
            />

            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              <article className="surface-panel rounded-[2rem] p-6 lg:min-h-[28rem]">
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-full border border-[#FF6B2B]/25 bg-[#FF6B2B]/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-accent">
                    Treino do dia
                  </span>
                  <span className="text-sm font-medium text-muted">Hoje</span>
                </div>

                <h3 className="text-balance mt-6 font-display text-[2rem] font-semibold leading-[0.98] tracking-[-0.05em] text-white">
                  Pronto para treinar sem pensar no próximo passo.
                </h3>

                <p className="mt-4 text-sm leading-6 text-muted">
                  O aluno abre o app e encontra foco, estrutura e ritmo no primeiro bloco da tela.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <MetricPill>Treino A</MetricPill>
                  <MetricPill>Peito + tríceps</MetricPill>
                  <MetricPill>Semana 2 de 6</MetricPill>
                </div>

                <div className="mt-8 rounded-[1.75rem] border border-white/8 bg-[#121212] p-4">
                  <div className="flex items-center justify-between text-sm text-muted">
                    <span>Volume</span>
                    <span>7 exercícios</span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/7">
                    <div className="h-full w-[62%] rounded-full bg-accent" />
                  </div>
                  <div className="mt-5 rounded-full bg-accent px-4 py-3 text-center text-sm font-semibold text-white">
                    Iniciar treino
                  </div>
                </div>
              </article>

              <article className="surface-panel rounded-[2rem] p-6 lg:min-h-[28rem]">
                <div className="flex items-center justify-between gap-4 text-sm text-muted">
                  <span>Execução</span>
                  <span>03 de 07</span>
                </div>

                <h3 className="text-balance mt-6 font-display text-[2rem] font-semibold leading-[0.98] tracking-[-0.05em] text-white">
                  Supino reto com halteres
                </h3>

                <p className="mt-4 text-sm leading-6 text-muted">
                  O app guia série, carga e descanso sem perder o contexto da sessão.
                </p>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-center">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted">Serie</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">3</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-center">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted">Reps</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">10</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-center">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted">Carga</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">26 kg</p>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.75rem] border border-white/8 bg-[#121212] p-4">
                  <div className="flex items-center justify-between text-sm text-muted">
                    <span>Descanso</span>
                    <span>01:30</span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/7">
                    <div className="h-full w-2/3 rounded-full bg-white" />
                  </div>
                  <div className="mt-5 flex gap-2">
                    <div className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold text-white">
                      Ajustar
                    </div>
                    <div className="flex-1 rounded-full bg-accent px-4 py-3 text-center text-sm font-semibold text-white">
                      Concluir série
                    </div>
                  </div>
                </div>
              </article>

              <article className="surface-panel rounded-[2rem] p-6 lg:min-h-[28rem]">
                <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/82">
                  Conclusão
                </div>

                <h3 className="text-balance mt-6 font-display text-[2rem] font-semibold leading-[0.98] tracking-[-0.05em] text-white">
                  Sessão encerrada com clareza.
                </h3>

                <p className="mt-4 text-sm leading-6 text-muted">
                  Resumo rápido, leitura do dia e espaço para feedback sem fricção.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted">Duração</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">52 min</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted">Series</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">20</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted">Carga</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">32 kg</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted">Status</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">OK</p>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.75rem] border border-[#FF6B2B]/18 bg-[#FF6B2B]/10 p-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-accent">
                    Resumo do dia
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/90">
                    20 séries registradas, melhor carga em alta e feedback pronto para fechar a sessão.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Para quem é"
              title="Do aluno que quer parar de improvisar ao personal que quer entregar melhor."
            />

            <div className="mt-12 grid gap-4 md:grid-cols-2">
              <article className="surface-panel rounded-[2rem] p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                  Quero treinar com orientação
                </p>
                <h3 className="mt-5 font-display text-3xl font-semibold tracking-[-0.05em] text-white">
                  Menos improviso. Mais clareza para treinar.
                </h3>
                <p className="mt-4 max-w-md text-base leading-7 text-muted">
                  Para quem não tem personal e quer parar de treinar no improviso.
                </p>
                <div className="mt-8">
                  <ActionLink href="#final-cta" variant="primary">
                    Quero meu programa
                  </ActionLink>
                </div>
              </article>

              <article className="surface-panel rounded-[2rem] p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                  Já tenho um personal
                </p>
                <h3 className="mt-5 font-display text-3xl font-semibold tracking-[-0.05em] text-white">
                  Um lugar só para receber, executar e acompanhar.
                </h3>
                <p className="mt-4 max-w-md text-base leading-7 text-muted">
                  Para quem quer receber, executar e acompanhar treinos em um só lugar.
                </p>
                <div className="mt-8">
                  <ActionLink href="#final-cta" variant="secondary">
                    Começar com meu personal
                  </ActionLink>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-surface/60 py-20 sm:py-24">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Prova social</p>
              <p className="mt-4 bg-[linear-gradient(135deg,#FFFFFF_15%,#FF6B2B_88%)] bg-clip-text font-display text-5xl font-semibold tracking-[-0.08em] text-transparent sm:text-6xl lg:text-7xl">
                + de 500 programas criados
              </p>
              <p className="mt-5 max-w-md text-base leading-7 text-muted sm:text-lg">
                O Move nasce para transformar prescrição em experiência. Os números e depoimentos abaixo são ilustrativos do MVP.
              </p>
            </div>

            <div className="space-y-4">
              {testimonials.map((testimonial) => (
                <article key={testimonial.author} className="surface-panel rounded-[2rem] p-6">
                  <p className="text-lg leading-8 text-white">“{testimonial.quote}”</p>
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-white">{testimonial.author}</p>
                    <p className="mt-1 text-sm text-muted">{testimonial.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="personal" className="scroll-mt-28 py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8">
            <div className="surface-panel rounded-[2.2rem] bg-[linear-gradient(135deg,rgba(255,107,43,0.12),rgba(255,255,255,0.02))] p-6 sm:p-8 lg:p-10">
              <div className="grid gap-6 lg:grid-cols-[1.15fr_auto] lg:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
                    Personal
                  </p>
                  <h2 className="text-balance mt-4 font-display text-3xl font-semibold tracking-[-0.06em] text-white sm:text-4xl lg:text-[3rem]">
                    Você é personal trainer?
                  </h2>
                  <p className="text-balance mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                    Organize alunos, acompanhe evolução e entregue treinos com uma experiência melhor.
                  </p>
                </div>

                <div>
                  <ActionLink href="#final-cta" variant="primary">
                    Usar com meus alunos →
                  </ActionLink>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="final-cta" className="scroll-mt-28 pb-20 sm:pb-24">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8">
            <div className="surface-panel rounded-[2.2rem] p-6 sm:p-8 lg:p-10">
              <SectionHeading
                eyebrow="CTA final"
                title="Treino feito para você. Não para todo mundo."
                description="Entre cedo e receba a primeira experiência do Move assim que ela estiver pronta."
                align="center"
              />

              <form className="mx-auto mt-10 max-w-4xl">
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <label className="block">
                    <span className="sr-only">Nome</span>
                    <input
                      type="text"
                      name="name"
                      placeholder="Seu nome"
                      className="w-full rounded-2xl border border-white/8 bg-black/30 px-4 py-4 text-base text-white outline-none transition placeholder:text-muted focus:border-[#FF6B2B]/60 focus:bg-black/50"
                    />
                  </label>

                  <label className="block">
                    <span className="sr-only">Email</span>
                    <input
                      type="email"
                      name="email"
                      placeholder="Seu e-mail"
                      className="w-full rounded-2xl border border-white/8 bg-black/30 px-4 py-4 text-base text-white outline-none transition placeholder:text-muted focus:border-[#FF6B2B]/60 focus:bg-black/50"
                    />
                  </label>

                  <button
                    type="button"
                    className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-accent px-6 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(255,107,43,0.32)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#ff7d45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B2B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D0D]"
                  >
                    Criar minha conta
                  </button>
                </div>

                <p className="mt-4 text-center text-sm text-muted">
                  Cadastro visual do MVP. Quando abrir, quem entrar primeiro recebe prioridade.
                </p>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="font-display text-2xl font-semibold tracking-[-0.08em] text-white">Move</p>
            <p className="mt-2 text-sm text-muted">Treino feito para você. Não para todo mundo.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
            <Link href="/termos" className="transition hover:text-white">
              Termos
            </Link>
            <Link href="/privacidade" className="transition hover:text-white">
              Privacidade
            </Link>
            <span>© {currentYear} Move. Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
