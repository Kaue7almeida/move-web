"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";

import type { MeNextStep, MeResponse, OnboardingRole } from "@/bff/modules/profile/types";
import {
  UnauthenticatedRequestError,
  authenticatedFetch,
  readApiErrorMessage,
} from "@/services/api/authenticatedFetch";
import { getSupabaseBrowserClient } from "@/services/auth/supabaseClient";

type StudentOnboardingFormState = {
  fullName: string;
  birthDate: string;
  sex: string;
  weightKg: string;
  heightCm: string;
  trainingGoal: string;
  trainingLevel: string;
  trainingProfile: string;
};

type TrainerOnboardingFormState = {
  professionalName: string;
  specialties: string[];
  studentCountRange: string;
  workModel: string;
  bio: string;
};

type ChoiceOption = {
  value: string;
  label: string;
  description?: string;
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[0.95rem] text-white outline-none transition placeholder:text-white/35 focus:border-[#f26a1b]/55 focus:bg-white/[0.05]";

const optionButtonBaseClassName =
  "rounded-xl border px-4 py-3.5 text-left transition duration-200";

const sexOptions = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "prefiro não informar", label: "Prefiro nao informar" },
] as const;

const trainingGoalOptions = [
  { value: "ganhar massa", label: "Ganhar massa" },
  { value: "perder gordura", label: "Perder gordura" },
  { value: "condicionamento", label: "Condicionamento" },
  { value: "saúde e rotina", label: "Saude e rotina" },
  { value: "performance", label: "Performance" },
] as const;

const trainingLevelOptions = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediário", label: "Intermediario" },
  { value: "avançado", label: "Avancado" },
] as const;

const trainingProfileOptions = [
  { value: "academia", label: "Academia" },
  { value: "casa", label: "Casa" },
  { value: "ao ar livre", label: "Ao ar livre" },
  { value: "híbrido", label: "Hibrido" },
] as const;

const trainerSpecialtyOptions = [
  { value: "hipertrofia", label: "Hipertrofia" },
  { value: "emagrecimento", label: "Emagrecimento" },
  { value: "condicionamento", label: "Condicionamento" },
  { value: "mobilidade", label: "Mobilidade" },
  { value: "corrida", label: "Corrida" },
  { value: "treino funcional", label: "Treino funcional" },
] as const;

const studentCountRangeOptions = [
  { value: "ate_10", label: "Ate 10 alunos" },
  { value: "11_30", label: "11 a 30 alunos" },
  { value: "31_60", label: "31 a 60 alunos" },
  { value: "mais_60", label: "Mais de 60 alunos" },
] as const;

const workModelOptions = [
  { value: "online", label: "Online" },
  { value: "presencial", label: "Presencial" },
  { value: "hibrido", label: "Hibrido" },
] as const;

const emptyStudentFormState: StudentOnboardingFormState = {
  fullName: "",
  birthDate: "",
  sex: "",
  weightKg: "",
  heightCm: "",
  trainingGoal: "",
  trainingLevel: "",
  trainingProfile: "",
};

const emptyTrainerFormState: TrainerOnboardingFormState = {
  professionalName: "",
  specialties: [],
  studentCountRange: "",
  workModel: "",
  bio: "",
};

function toOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function getRedirectParam(searchParams: URLSearchParams): string | null {
  const redirect = searchParams.get("redirect");

  if (!redirect || !redirect.startsWith("/")) {
    return null;
  }

  return redirect;
}

function resolvePostAuthRoute(nextStep: MeNextStep, redirectTo: string | null) {
  if (nextStep === "student_home" || nextStep === "trainer_home") {
    return redirectTo ?? "/app";
  }

  return "/onboarding";
}

function createStudentFormState(me: MeResponse, fullNameFromQuery?: string): StudentOnboardingFormState {
  return {
    fullName: fullNameFromQuery ?? me.profile?.full_name ?? "",
    birthDate: me.studentProfile?.birth_date ?? "",
    sex: me.studentProfile?.sex ?? "",
    weightKg: me.studentProfile?.weight_kg?.toString() ?? "",
    heightCm: me.studentProfile?.height_cm?.toString() ?? "",
    trainingGoal: me.studentProfile?.training_goal ?? "",
    trainingLevel: me.studentProfile?.training_level ?? "",
    trainingProfile: me.studentProfile?.training_profile ?? "",
  };
}

function createTrainerFormState(me: MeResponse, fullNameFromQuery?: string): TrainerOnboardingFormState {
  return {
    professionalName:
      me.trainerProfile?.display_name
      ?? fullNameFromQuery
      ?? me.profile?.full_name
      ?? "",
    specialties: me.trainerProfile?.specialties ?? [],
    studentCountRange: me.trainerProfile?.student_count_range ?? "",
    workModel: me.trainerProfile?.work_model ?? "",
    bio: me.trainerProfile?.bio ?? "",
  };
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const isActive = i + 1 === current;
        const isDone = i + 1 < current;
        return (
          <span
            key={i}
            className={[
              "h-1.5 rounded-full transition-all duration-300",
              isActive ? "w-9 bg-[#f26a1b]" : isDone ? "w-2.5 bg-[#f26a1b]/55" : "w-2.5 bg-white/15",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="block text-[0.82rem] font-semibold text-white/80">{children}</span>;
}

function ChoiceGroup({
  label,
  description,
  value,
  options,
  columnsClassName,
  onSelect,
}: {
  label: string;
  description?: string;
  value: string;
  options: readonly ChoiceOption[];
  columnsClassName: string;
  onSelect: (nextValue: string) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {description ? (
        <p className="mt-1 text-[0.82rem] leading-5 text-white/45">{description}</p>
      ) : null}

      <div className={`mt-3 grid gap-2.5 ${columnsClassName}`}>
        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={[
                optionButtonBaseClassName,
                isSelected
                  ? "border-[#f26a1b]/55 bg-[#f26a1b]/10 text-white"
                  : "border-white/10 bg-white/[0.02] text-white/88 hover:border-white/20 hover:bg-white/[0.04]",
              ].join(" ")}
            >
              <span className="block text-[0.9rem] font-semibold">{option.label}</span>
              {option.description ? (
                <span className="mt-1.5 block text-[0.82rem] leading-5 text-white/50">{option.description}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MultiChoiceGroup({
  label,
  description,
  values,
  options,
  columnsClassName,
  onToggle,
}: {
  label: string;
  description?: string;
  values: string[];
  options: readonly ChoiceOption[];
  columnsClassName: string;
  onToggle: (nextValue: string) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {description ? (
        <p className="mt-1 text-[0.82rem] leading-5 text-white/45">{description}</p>
      ) : null}

      <div className={`mt-3 grid gap-2.5 ${columnsClassName}`}>
        {options.map((option) => {
          const isSelected = values.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={[
                optionButtonBaseClassName,
                isSelected
                  ? "border-[#f26a1b]/55 bg-[#f26a1b]/10 text-white"
                  : "border-white/10 bg-white/[0.02] text-white/88 hover:border-white/20 hover:bg-white/[0.04]",
              ].join(" ")}
            >
              <span className="block text-[0.9rem] font-semibold">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** useSearchParams exige um Suspense boundary no prerender estatico. */
export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPageContent />
    </Suspense>
  );
}

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const fullNameFromQuery = searchParams.get("fullName") ?? undefined;
  const redirectTo = getRedirectParam(searchParams);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [studentFormState, setStudentFormState] =
    useState<StudentOnboardingFormState>(emptyStudentFormState);
  const [trainerFormState, setTrainerFormState] =
    useState<TrainerOnboardingFormState>(emptyTrainerFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelectingRole, setIsSelectingRole] = useState<OnboardingRole | null>(null);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [isSubmittingTrainer, setIsSubmittingTrainer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function applyMeState(currentMe: MeResponse) {
    setMe(currentMe);
    setStudentFormState(createStudentFormState(currentMe, fullNameFromQuery));
    setTrainerFormState(createTrainerFormState(currentMe, fullNameFromQuery));
  }

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.access_token) {
        router.replace(redirectTo ? `/entrar?redirect=${encodeURIComponent(redirectTo)}` : "/entrar");
        return;
      }

      try {
        const response = await authenticatedFetch("/api/v1/me", {
          accessToken: data.session.access_token,
          method: "GET",
        });

        if (response.status === 401) {
          await supabase.auth.signOut();
          router.replace(redirectTo ? `/entrar?redirect=${encodeURIComponent(redirectTo)}` : "/entrar");
          return;
        }

        if (!response.ok) {
          const message = await readApiErrorMessage(
            response,
            "Não foi possível carregar seus dados de onboarding.",
          );

          if (isMounted) {
            setErrorMessage(message);
            setIsLoading(false);
          }

          return;
        }

        const currentMe = (await response.json()) as MeResponse;

        if (currentMe.nextStep === "student_home" || currentMe.nextStep === "trainer_home") {
          router.replace(resolvePostAuthRoute(currentMe.nextStep, redirectTo));
          return;
        }

        if (isMounted) {
          applyMeState(currentMe);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        if (error instanceof UnauthenticatedRequestError) {
          router.replace(redirectTo ? `/entrar?redirect=${encodeURIComponent(redirectTo)}` : "/entrar");
          return;
        }

        if (isMounted) {
          setErrorMessage("Não foi possível carregar seus dados de onboarding.");
          setIsLoading(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullNameFromQuery, redirectTo, router, searchParams, supabase]);

  async function handleRoleSelection(role: OnboardingRole) {
    setErrorMessage(null);
    setIsSelectingRole(role);

    try {
      const roleSelectionName =
        role === "trainer" ? trainerFormState.professionalName.trim() : studentFormState.fullName.trim();

      const response = await authenticatedFetch("/api/v1/onboarding/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          ...(roleSelectionName ? { fullName: roleSelectionName } : {}),
        }),
      });

      if (response.status === 401) {
        await supabase.auth.signOut();
        router.replace(redirectTo ? `/entrar?redirect=${encodeURIComponent(redirectTo)}` : "/entrar");
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          await readApiErrorMessage(response, "Não foi possível salvar sua escolha de papel."),
        );
        return;
      }

      const updatedMe = (await response.json()) as MeResponse;

      if (updatedMe.nextStep === "student_home" || updatedMe.nextStep === "trainer_home") {
        router.replace(resolvePostAuthRoute(updatedMe.nextStep, redirectTo));
        return;
      }

      applyMeState(updatedMe);
    } catch (error: unknown) {
      if (error instanceof UnauthenticatedRequestError) {
        router.replace(redirectTo ? `/entrar?redirect=${encodeURIComponent(redirectTo)}` : "/entrar");
        return;
      }

      setErrorMessage("Não foi possível salvar sua escolha de papel.");
    } finally {
      setIsSelectingRole(null);
    }
  }

  async function handleStudentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmittingStudent(true);

    if (
      !studentFormState.fullName.trim()
      || !studentFormState.trainingGoal
      || !studentFormState.trainingLevel
      || !studentFormState.trainingProfile
    ) {
      setErrorMessage("Preencha seu nome e selecione objetivo, nivel e perfil de treino para continuar.");
      setIsSubmittingStudent(false);
      return;
    }

    try {
      const response = await authenticatedFetch("/api/v1/onboarding/student", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: studentFormState.fullName,
          ...(studentFormState.birthDate ? { birthDate: studentFormState.birthDate } : {}),
          ...(studentFormState.sex ? { sex: studentFormState.sex } : {}),
          ...(studentFormState.weightKg
            ? { weightKg: toOptionalNumber(studentFormState.weightKg) }
            : {}),
          ...(studentFormState.heightCm
            ? { heightCm: toOptionalNumber(studentFormState.heightCm) }
            : {}),
          ...(studentFormState.trainingGoal ? { trainingGoal: studentFormState.trainingGoal } : {}),
          ...(studentFormState.trainingLevel ? { trainingLevel: studentFormState.trainingLevel } : {}),
          ...(studentFormState.trainingProfile
            ? { trainingProfile: studentFormState.trainingProfile }
            : {}),
        }),
      });

      if (response.status === 401) {
        await supabase.auth.signOut();
        router.replace(redirectTo ? `/entrar?redirect=${encodeURIComponent(redirectTo)}` : "/entrar");
        return;
      }

      if (!response.ok) {
        setErrorMessage(await readApiErrorMessage(response, "Não foi possível concluir o onboarding."));
        setIsSubmittingStudent(false);
        return;
      }

      const updatedMe = (await response.json()) as MeResponse;

      if (updatedMe.nextStep === "student_home" || updatedMe.nextStep === "trainer_home") {
        router.replace(resolvePostAuthRoute(updatedMe.nextStep, redirectTo));
        return;
      }

      applyMeState(updatedMe);
    } catch (error: unknown) {
      if (error instanceof UnauthenticatedRequestError) {
        router.replace(redirectTo ? `/entrar?redirect=${encodeURIComponent(redirectTo)}` : "/entrar");
        return;
      }

      setErrorMessage("Não foi possível concluir o onboarding.");
    } finally {
      setIsSubmittingStudent(false);
    }
  }

  async function handleTrainerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmittingTrainer(true);

    if (
      !trainerFormState.professionalName.trim()
      || trainerFormState.specialties.length === 0
      || !trainerFormState.studentCountRange
      || !trainerFormState.workModel
    ) {
      setErrorMessage(
        "Preencha nome profissional, especialidades, faixa de alunos e modelo de trabalho para continuar.",
      );
      setIsSubmittingTrainer(false);
      return;
    }

    try {
      const response = await authenticatedFetch("/api/v1/onboarding/trainer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professionalName: trainerFormState.professionalName,
          specialties: trainerFormState.specialties,
          studentCountRange: trainerFormState.studentCountRange,
          workModel: trainerFormState.workModel,
          ...(trainerFormState.bio.trim() ? { bio: trainerFormState.bio } : {}),
        }),
      });

      if (response.status === 401) {
        await supabase.auth.signOut();
        router.replace(redirectTo ? `/entrar?redirect=${encodeURIComponent(redirectTo)}` : "/entrar");
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          await readApiErrorMessage(response, "Não foi possível concluir o onboarding do personal."),
        );
        return;
      }

      const updatedMe = (await response.json()) as MeResponse;

      if (updatedMe.nextStep === "student_home" || updatedMe.nextStep === "trainer_home") {
        router.replace(resolvePostAuthRoute(updatedMe.nextStep, redirectTo));
        return;
      }

      applyMeState(updatedMe);
    } catch (error: unknown) {
      if (error instanceof UnauthenticatedRequestError) {
        router.replace(redirectTo ? `/entrar?redirect=${encodeURIComponent(redirectTo)}` : "/entrar");
        return;
      }

      setErrorMessage("Não foi possível concluir o onboarding do personal.");
    } finally {
      setIsSubmittingTrainer(false);
    }
  }

  function updateStudentField<
    K extends keyof StudentOnboardingFormState,
  >(field: K, value: StudentOnboardingFormState[K]) {
    setStudentFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateTrainerField<
    K extends keyof TrainerOnboardingFormState,
  >(field: K, value: TrainerOnboardingFormState[K]) {
    setTrainerFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleTrainerSpecialty(nextSpecialty: string) {
    setTrainerFormState((current) => ({
      ...current,
      specialties: current.specialties.includes(nextSpecialty)
        ? current.specialties.filter((item) => item !== nextSpecialty)
        : [...current.specialties, nextSpecialty],
    }));
  }

  const showRoleChoice = me?.nextStep === "role_selection";
  const showTrainerForm = me?.nextStep === "trainer_onboarding";
  const showStudentForm = me?.nextStep === "student_onboarding";

  const currentStep = showRoleChoice ? 1 : 2;

  const eyebrow = showRoleChoice
    ? "Passo 01 · Perfil"
    : showTrainerForm
      ? "Passo 02 · Personal"
      : "Passo 02 · Aluno";
  const title = showRoleChoice
    ? "Como voce vai usar o Move?"
    : showTrainerForm
      ? "Conte rapidamente sobre seu trabalho."
      : "Como voce treina hoje?";
  const description = showRoleChoice
    ? "Sua escolha define a experiencia do produto. Voce pode mudar depois com suporte."
    : showTrainerForm
      ? "Esses dados ajudam seus alunos a te encontrar e contextualizam o painel."
      : "Esses dados ajudam seu personal a montar o treino certo pra voce.";

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
        <StepIndicator current={currentStep} total={2} />
      </header>

      <main className="flex min-h-[calc(100vh-5rem)] items-start justify-center px-5 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-3xl">
          <div className="text-center">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#f26a1b]">
              {eyebrow}
            </p>
            <h1 className="text-balance mt-4 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.05em] text-white sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-[0.95rem] leading-6 text-white/55 sm:text-base">
              {description}
            </p>
          </div>

          <div className="mt-9 rounded-3xl border border-white/8 bg-[#0d0d0d] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:p-8 lg:p-10">
            {isLoading ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-[0.9rem] text-white/55">
                Carregando...
              </div>
            ) : errorMessage && !showStudentForm && !showTrainerForm && !showRoleChoice ? (
              <div
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[0.85rem] text-red-100"
              >
                {errorMessage}
              </div>
            ) : null}

            {/* ─── Role selection (Personal primeiro) ─── */}
            {!isLoading && showRoleChoice ? (
              <div className="space-y-3">
                {/* Personal — destaque principal */}
                <button
                  type="button"
                  onClick={() => void handleRoleSelection("trainer")}
                  disabled={isSelectingRole !== null}
                  className="group relative flex w-full flex-col items-start rounded-2xl border border-[#f26a1b]/35 bg-gradient-to-br from-[#f26a1b]/12 to-[#f26a1b]/4 px-5 py-5 text-left transition duration-200 hover:border-[#f26a1b]/55 hover:from-[#f26a1b]/16 hover:to-[#f26a1b]/6 disabled:cursor-not-allowed disabled:opacity-70 sm:px-6 sm:py-6"
                >
                  <span className="absolute right-5 top-5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#f26a1b]/85">
                    Recomendado
                  </span>
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#f26a1b]">
                    Personal
                  </span>
                  <span className="mt-3 font-display text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                    Sou personal trainer
                  </span>
                  <span className="mt-2 text-[0.92rem] leading-6 text-white/65">
                    Criar treinos, organizar alunos e acompanhar a execucao deles.
                  </span>
                </button>

                {/* Aluno — opcao secundaria */}
                <button
                  type="button"
                  onClick={() => void handleRoleSelection("student")}
                  disabled={isSelectingRole !== null}
                  className="flex w-full flex-col items-start rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-5 text-left transition duration-200 hover:border-white/20 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-70 sm:px-6 sm:py-6"
                >
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white/55">
                    Aluno
                  </span>
                  <span className="mt-3 font-display text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                    Sou aluno
                  </span>
                  <span className="mt-2 text-[0.92rem] leading-6 text-white/55">
                    Receber treinos do meu personal e treinar pelo app.
                  </span>
                </button>

                {isSelectingRole ? (
                  <p className="pt-2 text-center text-[0.85rem] text-white/55">
                    Salvando sua escolha...
                  </p>
                ) : null}

                {errorMessage ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[0.85rem] text-red-100"
                  >
                    {errorMessage}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* ─── Trainer form ─── */}
            {!isLoading && showTrainerForm ? (
              <form className="space-y-7" onSubmit={handleTrainerSubmit} noValidate>
                <label className="block">
                  <FieldLabel>Nome profissional</FieldLabel>
                  <input
                    type="text"
                    value={trainerFormState.professionalName}
                    onChange={(event) => updateTrainerField("professionalName", event.target.value)}
                    className={inputClassName}
                    placeholder="Como seus alunos te conhecem"
                    required
                  />
                </label>

                <label className="block">
                  <FieldLabel>Sobre voce (opcional)</FieldLabel>
                  <textarea
                    value={trainerFormState.bio}
                    onChange={(event) => updateTrainerField("bio", event.target.value)}
                    className={`${inputClassName} min-h-24 resize-y`}
                    placeholder="Em poucas linhas: foco do seu trabalho e forma de acompanhar"
                  />
                </label>

                <MultiChoiceGroup
                  label="Especialidades"
                  description="Escolha pelo menos uma."
                  values={trainerFormState.specialties}
                  options={trainerSpecialtyOptions}
                  columnsClassName="sm:grid-cols-2 lg:grid-cols-3"
                  onToggle={toggleTrainerSpecialty}
                />

                <div className="grid gap-7 lg:grid-cols-2">
                  <ChoiceGroup
                    label="Quantos alunos voce acompanha hoje?"
                    value={trainerFormState.studentCountRange}
                    options={studentCountRangeOptions}
                    columnsClassName="sm:grid-cols-2 lg:grid-cols-1"
                    onSelect={(nextValue) => updateTrainerField("studentCountRange", nextValue)}
                  />

                  <ChoiceGroup
                    label="Como voce trabalha?"
                    value={trainerFormState.workModel}
                    options={workModelOptions}
                    columnsClassName="sm:grid-cols-3 lg:grid-cols-1"
                    onSelect={(nextValue) => updateTrainerField("workModel", nextValue)}
                  />
                </div>

                {errorMessage ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[0.85rem] text-red-100"
                  >
                    {errorMessage}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmittingTrainer || isLoading}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#f26a1b] px-6 text-[0.92rem] font-semibold text-white shadow-[0_18px_42px_rgba(242,106,27,0.32)] transition duration-200 hover:bg-[#ff7d35] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingTrainer ? "Salvando..." : "Concluir cadastro"}
                </button>
              </form>
            ) : null}

            {/* ─── Student form ─── */}
            {!isLoading && showStudentForm ? (
              <form className="space-y-7" onSubmit={handleStudentSubmit} noValidate>
                <label className="block">
                  <FieldLabel>Nome completo</FieldLabel>
                  <input
                    type="text"
                    value={studentFormState.fullName}
                    onChange={(event) => updateStudentField("fullName", event.target.value)}
                    className={inputClassName}
                    placeholder="Como voce quer aparecer no Move"
                    required
                  />
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel>Data de nascimento</FieldLabel>
                    <input
                      type="date"
                      value={studentFormState.birthDate}
                      onChange={(event) => updateStudentField("birthDate", event.target.value)}
                      className={inputClassName}
                    />
                  </label>

                  <label className="block">
                    <FieldLabel>Peso (kg)</FieldLabel>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      value={studentFormState.weightKg}
                      onChange={(event) => updateStudentField("weightKg", event.target.value)}
                      className={inputClassName}
                      placeholder="Ex.: 72.5"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <FieldLabel>Altura (cm)</FieldLabel>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      value={studentFormState.heightCm}
                      onChange={(event) => updateStudentField("heightCm", event.target.value)}
                      className={inputClassName}
                      placeholder="Ex.: 178"
                    />
                  </label>
                </div>

                <ChoiceGroup
                  label="Sexo"
                  description="Opcional. So preencha se fizer sentido pro acompanhamento."
                  value={studentFormState.sex}
                  options={sexOptions}
                  columnsClassName="sm:grid-cols-3"
                  onSelect={(nextValue) => updateStudentField("sex", nextValue)}
                />

                <ChoiceGroup
                  label="Seu foco principal agora"
                  value={studentFormState.trainingGoal}
                  options={trainingGoalOptions}
                  columnsClassName="sm:grid-cols-2 lg:grid-cols-3"
                  onSelect={(nextValue) => updateStudentField("trainingGoal", nextValue)}
                />

                <div className="grid gap-7 lg:grid-cols-2">
                  <ChoiceGroup
                    label="Nivel de treino"
                    value={studentFormState.trainingLevel}
                    options={trainingLevelOptions}
                    columnsClassName="sm:grid-cols-3 lg:grid-cols-1"
                    onSelect={(nextValue) => updateStudentField("trainingLevel", nextValue)}
                  />

                  <ChoiceGroup
                    label="Onde voce mais treina"
                    value={studentFormState.trainingProfile}
                    options={trainingProfileOptions}
                    columnsClassName="sm:grid-cols-2 lg:grid-cols-1"
                    onSelect={(nextValue) => updateStudentField("trainingProfile", nextValue)}
                  />
                </div>

                {errorMessage ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[0.85rem] text-red-100"
                  >
                    {errorMessage}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmittingStudent || isLoading}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#f26a1b] px-6 text-[0.92rem] font-semibold text-white shadow-[0_18px_42px_rgba(242,106,27,0.32)] transition duration-200 hover:bg-[#ff7d35] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingStudent ? "Salvando..." : "Concluir cadastro"}
                </button>
              </form>
            ) : null}

            {!isLoading && !showRoleChoice && !showTrainerForm && !showStudentForm ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-[0.9rem] text-white/55">
                Nenhum fluxo de onboarding aplicavel foi encontrado para este usuario.
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
