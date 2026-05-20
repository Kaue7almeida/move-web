import type { Metadata } from "next";
import Link from "next/link";

const sections = [
  {
    title: "Escopo inicial",
    body:
      "A página de privacidade do MVP do Move existe para sinalizar o compromisso com o tratamento responsável de dados. O texto jurídico definitivo será publicado antes da operação comercial.",
  },
  {
    title: "Dados informados",
    body:
      "Durante a fase inicial, formulários públicos podem solicitar nome e e-mail para interesse no produto. Nenhuma integração real de envio foi ativada nesta versão da landing.",
  },
  {
    title: "Atualizações futuras",
    body:
      "Quando autenticação, painel e operação completa estiverem disponíveis, a política definitiva vai detalhar coleta, finalidade, prazo de retenção e direitos do usuário.",
  },
] as const;

export const metadata: Metadata = {
  title: "Privacidade",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-12 sm:px-6 lg:px-8">
      <Link href="/" className="font-display text-2xl font-semibold tracking-[-0.08em] text-white">
        Move
      </Link>

      <div className="surface-panel mt-12 rounded-[2rem] p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Privacidade</p>
        <h1 className="text-balance mt-4 font-display text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
          Política inicial de privacidade
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          Versão resumida e informativa para a primeira fase pública do Move.
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