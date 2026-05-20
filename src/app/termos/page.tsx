import type { Metadata } from "next";
import Link from "next/link";

const sections = [
  {
    title: "Status do documento",
    body:
      "Esta página apresenta uma versão informativa inicial para o MVP do Move. Os termos jurídicos definitivos serão publicados antes da abertura pública do produto.",
  },
  {
    title: "Uso do Move",
    body:
      "O acesso antecipado ao Move será pessoal, intransferível e sujeito a disponibilidade. O objetivo desta fase é validar a experiência de uso do produto e a clareza da proposta.",
  },
  {
    title: "Atualizações",
    body:
      "As condições comerciais, regras de acesso e limitações da versão inicial podem ser atualizadas conforme o produto avançar. Quando houver lançamento oficial, uma versão completa substituirá este texto.",
  },
] as const;

export const metadata: Metadata = {
  title: "Termos",
};

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-12 sm:px-6 lg:px-8">
      <Link href="/" className="font-display text-2xl font-semibold tracking-[-0.08em] text-white">
        Move
      </Link>

      <div className="surface-panel mt-12 rounded-[2rem] p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Termos</p>
        <h1 className="text-balance mt-4 font-display text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
          Termos preliminares do MVP
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          Documento informativo inicial para a landing pública do Move.
        </p>

        <div className="mt-8 space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.04em] text-white">
                {section.title}
              </h2>
              <p className="mt-3 text-base leading-7 text-muted">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}