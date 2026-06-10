"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useState } from "react";

import { getSupabaseBrowserClient } from "@/services/auth/supabaseClient";

const inputClassName =
  "mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[0.95rem] text-white outline-none transition placeholder:text-white/35 focus:border-[#f26a1b]/55 focus:bg-white/[0.05]";

function getRedirectParam(searchParams: URLSearchParams): string | null {
  const redirect = searchParams.get("redirect");

  if (!redirect || !redirect.startsWith("/")) {
    return null;
  }

  return redirect;
}

/** useSearchParams exige um Suspense boundary no prerender estatico. */
export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <CadastroPageContent />
    </Suspense>
  );
}

function CadastroPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const redirectTo = getRedirectParam(searchParams);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginHref = redirectTo
    ? `/entrar?redirect=${encodeURIComponent(redirectTo)}`
    : "/entrar";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    if (data.session?.access_token) {
      const onboardingParams = new URLSearchParams({ fullName });

      if (redirectTo) {
        onboardingParams.set("redirect", redirectTo);
      }

      router.replace(`/onboarding?${onboardingParams.toString()}`);
      return;
    }

    setSuccessMessage(
      "Conta criada. Verifique seu email para confirmar antes de entrar.",
    );
    setIsSubmitting(false);
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#0a0a0a] text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[28rem] bg-[radial-gradient(circle_at_50%_0%,rgba(242,106,27,0.18),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-0 -z-30 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:96px_96px]" />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-[-0.06em] text-white sm:text-2xl"
        >
          Move
        </Link>
        <Link
          href={loginHref}
          className="text-[0.85rem] font-medium text-white/55 transition hover:text-white"
        >
          Entrar
        </Link>
      </header>

      <main className="flex min-h-[calc(100vh-5rem)] items-start justify-center px-5 pb-16 pt-8 sm:items-center sm:px-6 sm:pt-4 lg:px-8">
        <div className="w-full max-w-md">
          <div className="text-center">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#f26a1b]">
              Comece
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.05em] text-white sm:text-4xl">
              Crie sua conta no Move.
            </h1>
            <p className="mt-3 text-[0.95rem] leading-6 text-white/55">
              Em poucos passos voce ja tem seu primeiro treino pronto pra aplicar.
            </p>
          </div>

          <div className="mt-8 rounded-3xl border border-white/8 bg-[#0d0d0d] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:p-8">
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <label className="block text-[0.82rem] font-semibold text-white/80">
                Nome
                <input
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className={inputClassName}
                  placeholder="Seu nome completo"
                  disabled={isSubmitting}
                  required
                />
              </label>

              <label className="block text-[0.82rem] font-semibold text-white/80">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClassName}
                  placeholder="voce@exemplo.com"
                  disabled={isSubmitting}
                  required
                />
              </label>

              <label className="block text-[0.82rem] font-semibold text-white/80">
                Senha
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClassName}
                  placeholder="Minimo 6 caracteres"
                  minLength={6}
                  disabled={isSubmitting}
                  required
                />
                <span className="mt-1.5 block text-[0.75rem] font-normal text-white/40">
                  Pelo menos 6 caracteres.
                </span>
              </label>

              {errorMessage ? (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[0.85rem] leading-5 text-red-100"
                >
                  {errorMessage}
                </div>
              ) : null}

              {successMessage ? (
                <div
                  role="status"
                  className="rounded-xl border border-[#22c55e]/24 bg-[#22c55e]/10 px-4 py-3 text-[0.85rem] leading-5 text-white/90"
                >
                  {successMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#f26a1b] px-6 text-[0.92rem] font-semibold text-white shadow-[0_18px_42px_rgba(242,106,27,0.32)] transition duration-200 hover:bg-[#ff7d35] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Criando..." : "Criar conta"}
              </button>
            </form>
          </div>

          <p className="mt-7 text-center text-[0.88rem] text-white/55">
            Ja tem conta?{" "}
            <Link href={loginHref} className="font-semibold text-[#f26a1b] transition hover:text-[#ff7d35]">
              Entrar
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
