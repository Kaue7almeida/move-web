"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Dumbbell, ArrowRight, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

import {
  UnauthenticatedRequestError,
  authenticatedFetch,
  readApiErrorMessage,
} from "@/services/api/authenticatedFetch";
import { getAccessToken } from "@/services/auth/supabaseClient";

type TrainerPublicData = {
  displayName: string;
  specialties: string[];
};

type PageState =
  | { kind: "loading" }
  | { kind: "loaded"; trainer: TrainerPublicData; isAuthenticated: boolean }
  | { kind: "accepting" }
  | { kind: "accepted"; trainerName: string }
  | { kind: "error"; message: string }
  | { kind: "not_found" };

const PENDING_INVITE_KEY = "move-pending-invite";

export default function InvitePage() {
  const { inviteSlug } = useParams<{ inviteSlug: string }>();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ kind: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const response = await fetch(`/api/v1/invites/trainer/${inviteSlug}`);

        if (!isMounted) return;

        if (response.status === 404) {
          setState({ kind: "not_found" });
          return;
        }

        if (!response.ok) {
          setState({ kind: "error", message: "Não foi possível carregar o convite." });
          return;
        }

        const trainer = (await response.json()) as TrainerPublicData;
        const token = await getAccessToken();
        const isAuthenticated = Boolean(token);

        if (isMounted) {
          setState({ kind: "loaded", trainer, isAuthenticated });
        }
      } catch {
        if (isMounted) {
          setState({ kind: "error", message: "Não foi possível carregar o convite." });
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [inviteSlug]);

  async function handleAccept() {
    setState({ kind: "accepting" });

    try {
      const token = await getAccessToken();

      if (!token) {
        // Save invite slug for after login/signup
        try {
          localStorage.setItem(PENDING_INVITE_KEY, inviteSlug);
        } catch {
          // localStorage not available
        }
        router.push(`/entrar?redirect=/convite/${inviteSlug}`);
        return;
      }

      const response = await authenticatedFetch(
        `/api/v1/invites/trainer/${inviteSlug}/accept`,
        { method: "POST" },
      );

      if (response.status === 401) {
        throw new UnauthenticatedRequestError();
      }

      if (!response.ok) {
        const message = await readApiErrorMessage(
          response,
          "Não foi possível aceitar o convite.",
        );
        setState({ kind: "error", message });
        return;
      }

      const payload = (await response.json()) as {
        trainer: TrainerPublicData;
        relationshipStatus: string;
      };

      // Clear pending invite
      try {
        localStorage.removeItem(PENDING_INVITE_KEY);
      } catch {
        // localStorage not available
      }

      setState({ kind: "accepted", trainerName: payload.trainer.displayName });
    } catch (error: unknown) {
      if (error instanceof UnauthenticatedRequestError) {
        try {
          localStorage.setItem(PENDING_INVITE_KEY, inviteSlug);
        } catch {
          // localStorage not available
        }
        router.push(`/entrar?redirect=/convite/${inviteSlug}`);
        return;
      }
      setState({ kind: "error", message: "Não foi possível aceitar o convite." });
    }
  }

  function handleGoToLogin() {
    try {
      localStorage.setItem(PENDING_INVITE_KEY, inviteSlug);
    } catch {
      // localStorage not available
    }
    router.push(`/entrar?redirect=/convite/${inviteSlug}`);
  }

  function handleGoToSignUp() {
    try {
      localStorage.setItem(PENDING_INVITE_KEY, inviteSlug);
    } catch {
      // localStorage not available
    }
    router.push(`/cadastro?redirect=/convite/${inviteSlug}`);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <Dumbbell size={20} className="text-accent-on" strokeWidth={2} />
          </div>
          <span className="font-heading text-xl font-bold text-foreground tracking-tight">
            Move
          </span>
        </div>

        {/* Loading */}
        {state.kind === "loading" && (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center card-themed">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={24} className="animate-spin text-accent" />
              <p className="text-sm text-muted">Carregando convite...</p>
            </div>
          </div>
        )}

        {/* Not Found */}
        {state.kind === "not_found" && (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center card-themed">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-strong">
              <AlertCircle size={24} className="text-muted" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              Convite não encontrado
            </h1>
            <p className="mt-2 text-sm text-muted">
              Este link de convite não existe ou não está mais disponível.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover"
            >
              Ir para o Move
            </Link>
          </div>
        )}

        {/* Loaded — show invite card */}
        {state.kind === "loaded" && (
          <div className="rounded-2xl border border-border bg-surface p-8 card-themed">
            <div className="text-center">
              {/* Trainer initial avatar */}
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-muted text-2xl font-bold text-accent">
                {state.trainer.displayName.charAt(0).toUpperCase()}
              </div>

              <h1 className="text-lg font-semibold text-foreground">
                Você foi convidado para treinar com{" "}
                <span className="text-accent">{state.trainer.displayName}</span>
              </h1>

              <p className="mt-2 text-sm text-muted">
                {state.trainer.displayName} quer acompanhar seus treinos pelo Move.
              </p>

              {state.trainer.specialties.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {state.trainer.specialties.map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-accent-muted px-2.5 py-1 text-xs font-medium text-accent"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 space-y-3">
              {state.isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => void handleAccept()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover"
                >
                  Aceitar convite
                  <ArrowRight size={16} />
                </button>
              ) : (
                <>
                  <p className="text-center text-xs text-muted">
                    Crie sua conta ou entre para aceitar o convite.
                  </p>
                  <button
                    type="button"
                    onClick={handleGoToSignUp}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover"
                  >
                    Criar conta
                    <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToLogin}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-strong px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
                  >
                    Já tenho conta
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Accepting */}
        {state.kind === "accepting" && (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center card-themed">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={24} className="animate-spin text-accent" />
              <p className="text-sm text-muted">Aceitando convite...</p>
            </div>
          </div>
        )}

        {/* Accepted */}
        {state.kind === "accepted" && (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center card-themed">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
              <CheckCircle size={24} className="text-success" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              Convite aceito!
            </h1>
            <p className="mt-2 text-sm text-muted">
              Agora você está treinando com{" "}
              <span className="font-medium text-foreground">{state.trainerName}</span>.
            </p>
            <Link
              href="/app"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover"
            >
              Ir para o Move
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* Error */}
        {state.kind === "error" && (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center card-themed">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle size={24} className="text-red-500" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              Algo deu errado
            </h1>
            <p className="mt-2 text-sm text-muted">
              {state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-surface-strong px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
