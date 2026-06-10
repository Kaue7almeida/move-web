import type { MeNextStep, MeResponse, PrimaryRole } from "@/bff/modules/profile/types";

export type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  ctaLabel: string;
  href?: string;
  disabled?: boolean;
  disabledLabel?: string;
};

export type ChecklistSummary = {
  items: ChecklistItem[];
  completedCount: number;
  totalCount: number;
  nextItem: ChecklistItem | null;
};

export type AppNavigationItem = {
  href: string;
  label: string;
};

export function getFirstName(
  fullName: string | null | undefined,
  email: string | undefined,
  fallbackName: string,
) {
  const normalizedFullName = fullName?.trim();

  if (normalizedFullName) {
    return normalizedFullName.split(/\s+/)[0];
  }

  if (email) {
    return email.split("@")[0];
  }

  return fallbackName;
}

export function isOnboardingStep(nextStep: MeNextStep) {
  return (
    nextStep === "role_selection"
    || nextStep === "student_onboarding"
    || nextStep === "trainer_onboarding"
  );
}

export function getRoleLabel(me: MeResponse) {
  if (me.isStudent && me.isTrainer) {
    return "Aluno + Personal";
  }

  if (me.primaryRole === "trainer") {
    return "Personal";
  }

  if (me.isStudent) {
    return "Aluno";
  }

  return "Em configuração";
}

export function getRelationshipSummary(me: MeResponse) {
  const activeCount = me.relationships.filter((relationship) => relationship.status === "active").length;
  const pendingCount = me.relationships.filter((relationship) => relationship.status === "pending").length;

  return {
    activeCount,
    pendingCount,
    startedCount: activeCount + pendingCount,
  };
}

export function buildChecklistSummary(items: ChecklistItem[]): ChecklistSummary {
  const completedCount = items.filter((item) => item.completed).length;

  return {
    items,
    completedCount,
    totalCount: items.length,
    nextItem: items.find((item) => !item.completed) ?? null,
  };
}

export function buildStudentChecklist(me: MeResponse): ChecklistSummary {
  const relationshipSummary = getRelationshipSummary(me);
  const hasFullName = Boolean(me.profile?.full_name?.trim());
  const hasStudentProfile = me.studentProfile !== null;
  const hasTrainingGoal = Boolean(me.studentProfile?.training_goal?.trim());
  const hasConnectedTrainer = relationshipSummary.activeCount > 0;
  const hasAssignedWorkout = (me.studentStats?.assignedWorkoutCount ?? 0) > 0;
  const hasCompletedSession = (me.studentStats?.completedSessionCount ?? 0) > 0;

  return buildChecklistSummary([
    {
      id: "student-profile",
      title: "Perfil",
      description: hasFullName && hasStudentProfile
        ? "Seu perfil já está pronto para seguir em frente."
        : "Complete seu perfil para personalizar sua experiência.",
      completed: hasFullName && hasStudentProfile,
      ctaLabel: "Ver perfil",
      href: "/app/perfil",
    },
    {
      id: "student-goal",
      title: "Objetivo",
      description: hasTrainingGoal
        ? `Objetivo atual: ${me.studentProfile?.training_goal}.`
        : "Defina seu objetivo para deixar seu espaço mais alinhado ao que você busca.",
      completed: hasTrainingGoal,
      ctaLabel: "Atualizar perfil",
      href: "/app/perfil",
    },
    {
      id: "student-relationship",
      title: "Seu personal",
      description: hasConnectedTrainer
        ? "Você já tem um personal conectado ao seu espaço."
        : "Quando seu personal adicionar você, a conexão aparecerá aqui.",
      completed: hasConnectedTrainer,
      ctaLabel: "Aguardar conexão",
      disabled: true,
      disabledLabel: "Em breve",
    },
    {
      id: "student-first-workout-view",
      title: "Primeiro treino",
      description: hasAssignedWorkout
        ? "Você já tem treino na sua área. Abra e comece quando quiser."
        : "Quando seu personal aplicar um treino, ele aparece na sua área de treinos.",
      completed: hasAssignedWorkout,
      ctaLabel: "Ver treinos",
      href: "/app/treinos",
    },
    {
      id: "student-first-workout-complete",
      title: "Primeiro registro",
      description: hasCompletedSession
        ? "Você já registrou pelo menos um treino concluído."
        : "Conclua um treino na sua área para registrar sua primeira sessão.",
      completed: hasCompletedSession,
      ctaLabel: "Iniciar treino",
      href: "/app/treinos",
    },
  ]);
}

export function buildTrainerChecklist(me: MeResponse): ChecklistSummary {
  const relationshipSummary = getRelationshipSummary(me);
  const hasProfessionalProfile = Boolean(
    me.trainerOnboardingCompleted
    && me.trainerProfile?.display_name?.trim()
    && me.trainerProfile.specialties.length > 0
    && me.trainerProfile.student_count_range?.trim()
    && me.trainerProfile.work_model?.trim(),
  );
  const hasStudentBase = relationshipSummary.startedCount > 0;

  return buildChecklistSummary([
    {
      id: "trainer-profile",
      title: "Perfil profissional",
      description: hasProfessionalProfile
        ? "Seu perfil já está pronto para receber alunos."
        : "Complete seu perfil para organizar seu espaço no Move.",
      completed: hasProfessionalProfile,
      ctaLabel: "Ver perfil",
      href: "/app/perfil",
    },
    {
      id: "trainer-students",
      title: "Primeiro aluno",
      description: hasStudentBase
        ? `Você já tem ${relationshipSummary.startedCount} aluno(s) no seu espaço.`
        : "Adicione um aluno que já tem conta no Move para começar.",
      completed: hasStudentBase,
      ctaLabel: "Adicionar aluno",
      href: "/app/alunos",
    },
    {
      id: "trainer-first-workout",
      title: "Primeiro treino",
      description: "Crie seu primeiro treino para começar a montar a rotina dos seus alunos.",
      completed: false,
      ctaLabel: "Criar treino",
      href: "/app/treinos",
    },
    {
      id: "trainer-gallery",
      title: "Galeria de treinos",
      description: "Em breve você poderá salvar treinos para reutilizar com facilidade.",
      completed: false,
      ctaLabel: "Abrir galeria",
      disabled: true,
      disabledLabel: "Em breve",
    },
    {
      id: "trainer-assign",
      title: "Treino aplicado",
      description: "Em breve você poderá aplicar treinos para seus alunos.",
      completed: false,
      ctaLabel: "Ver treinos",
      disabled: true,
      disabledLabel: "Em breve",
    },
    {
      id: "trainer-follow-up",
      title: "Primeira execução",
      description: "Em breve você poderá acompanhar as primeiras execuções.",
      completed: false,
      ctaLabel: "Abrir acompanhamento",
      disabled: true,
      disabledLabel: "Em breve",
    },
  ]);
}

export function buildNavigation(
  primaryRole: PrimaryRole,
  isAdmin = false,
): AppNavigationItem[] {
  const adminItems: AppNavigationItem[] = isAdmin
    ? [{ href: "/app/admin", label: "Admin" }]
    : [];

  if (primaryRole === "trainer") {
    return [
      { href: "/app", label: "Início" },
      { href: "/app/alunos", label: "Alunos" },
      { href: "/app/treinos", label: "Treinos" },
      { href: "/app/chat", label: "Chat Move" },
      { href: "/app/galeria", label: "Galeria" },
      { href: "/app/acompanhamento", label: "Acompanhamento" },
      { href: "/app/perfil", label: "Perfil" },
      ...adminItems,
    ];
  }

  return [
    { href: "/app", label: "Início" },
    { href: "/app/treinos", label: "Treinos" },
    { href: "/app/chat", label: "Chat Move" },
    { href: "/app/galeria", label: "Galeria" },
    { href: "/app/historico", label: "Histórico" },
    { href: "/app/perfil", label: "Perfil" },
    { href: "/app/scan", label: "Scan" },
    ...adminItems,
  ];
}