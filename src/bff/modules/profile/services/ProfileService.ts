import { isAdminEmail } from "@/bff/core/auth/adminAccess";
import { ApiError } from "@/bff/core/errors/ApiError";
import type { IProfileRepository } from "@/bff/modules/profile/types/IProfileRepository";
import type {
  AcceptInviteResponse,
  CurrentUserIdentity,
  MeResponse,
  MeNextStep,
  OnboardingRole,
  PrimaryRole,
  RelationshipEventActorRole,
  RelationshipEventSource,
  RoleSelectionInput,
  TrainerPublicProfile,
  TrainerStudentLinkInput,
  TrainerStudentLinkResponse,
  TrainerStudentListResponse,
  StudentOnboardingInput,
  StudentProfileRecord,
  StudentStats,
  TrainerOnboardingInput,
  TrainerProfileRecord,
} from "@/bff/modules/profile/types";

function resolvePrimaryRole(
  isStudent: boolean,
  isTrainer: boolean,
): PrimaryRole {
  if (isTrainer) {
    return "trainer";
  }

  if (isStudent) {
    return "student";
  }

  return null;
}

function isStudentOnboardingCompleted(studentProfile: StudentProfileRecord | null) {
  return Boolean(studentProfile?.onboarding_completed_at);
}

function isTrainerOnboardingCompleted(trainerProfile: TrainerProfileRecord | null) {
  return Boolean(trainerProfile?.activated_at);
}

function resolveFullName({
  preferredName,
  existingName,
  email,
}: {
  preferredName?: string;
  existingName?: string | null;
  email?: string;
}) {
  const trimmedPreferredName = preferredName?.trim();

  if (trimmedPreferredName) {
    return trimmedPreferredName;
  }

  const trimmedExistingName = existingName?.trim();

  if (trimmedExistingName) {
    return trimmedExistingName;
  }

  const fallbackFromEmail = email?.split("@")[0]?.trim();

  if (fallbackFromEmail) {
    return fallbackFromEmail;
  }

  return "Usuário Move";
}

function assertRoleSelectionAvailable(currentMe: MeResponse) {
  if (currentMe.isStudent || currentMe.isTrainer) {
    throw new ApiError(
      409,
      "role_selection_unavailable",
      "A escolha inicial de papel não está disponível para este usuário.",
    );
  }
}

function assertExclusiveRoleAccess(targetRole: OnboardingRole, currentMe: MeResponse) {
  if (targetRole === "student" && currentMe.isTrainer && !currentMe.isStudent) {
    throw new ApiError(
      409,
      "student_role_conflict",
      "Seu acesso atual já está configurado como personal nesta fase inicial.",
    );
  }

  if (targetRole === "trainer" && currentMe.isStudent && !currentMe.isTrainer) {
    throw new ApiError(
      409,
      "trainer_role_conflict",
      "Seu acesso atual já está configurado como aluno nesta fase inicial.",
    );
  }
}

function assertTrainerCanManageStudents(currentMe: MeResponse) {
  if (!currentMe.isTrainer) {
    throw new ApiError(
      403,
      "trainer_access_required",
      "Apenas perfis de personal podem vincular alunos nesta etapa.",
    );
  }

  if (!currentMe.trainerOnboardingCompleted) {
    throw new ApiError(
      409,
      "trainer_onboarding_incomplete",
      "Conclua seu onboarding de personal antes de vincular alunos.",
    );
  }
}

function resolveStudentDisplayName(
  fullName: string | null | undefined,
  fallbackName: string,
) {
  const normalizedFullName = fullName?.trim();

  if (normalizedFullName) {
    return normalizedFullName;
  }

  return fallbackName.trim();
}

function resolveNextStep({
  isStudent,
  isTrainer,
  primaryRole,
  studentOnboardingCompleted,
  trainerOnboardingCompleted,
}: {
  isStudent: boolean;
  isTrainer: boolean;
  primaryRole: PrimaryRole;
  studentOnboardingCompleted: boolean;
  trainerOnboardingCompleted: boolean;
}): MeNextStep {
  if (isTrainer && !trainerOnboardingCompleted) {
    return "trainer_onboarding";
  }

  if (isStudent && !studentOnboardingCompleted) {
    return "student_onboarding";
  }

  if (!isStudent && !isTrainer) {
    return "role_selection";
  }

  if (primaryRole === "trainer") {
    return "trainer_home";
  }

  return "student_home";
}

function generateInviteSlug(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export class ProfileService {
  constructor(private readonly profileRepository: IProfileRepository) {}

  async getStudentsForTrainer(
    identity: CurrentUserIdentity,
  ): Promise<TrainerStudentListResponse> {
    const currentMe = await this.getCurrentUserProfile(identity);
    assertTrainerCanManageStudents(currentMe);

    const results = await this.profileRepository.findStudentProfilesForTrainer(identity.userId);

    const workoutCounts = await this.profileRepository.countActiveWorkoutsByTrainerForStudents(
      identity.userId,
      results.map(({ relationship }) => relationship.student_user_id),
    );

    const students = results.map(({ relationship, profile }) => ({
      userId: relationship.student_user_id,
      fullName: profile?.full_name?.trim() || "Aluno sem nome",
      email: profile?.email?.trim() || "",
      status: relationship.status,
      createdAt: relationship.created_at,
      activeWorkoutCount: workoutCounts.get(relationship.student_user_id) ?? 0,
    }));

    return { students };
  }

  async addStudentForTrainer(
    identity: CurrentUserIdentity,
    input: TrainerStudentLinkInput,
  ): Promise<TrainerStudentLinkResponse> {
    const currentMe = await this.getCurrentUserProfile(identity);
    assertTrainerCanManageStudents(currentMe);

    const normalizedEmail = input.studentEmail.trim().toLowerCase();
    const matchedProfiles = await this.profileRepository.findProfilesByEmail(normalizedEmail);

    if (matchedProfiles.length === 0) {
      throw new ApiError(
        404,
        "student_not_found",
        "Nenhum aluno existente foi encontrado com esse e-mail. Neste MVP, o aluno precisa já ter conta e papel de aluno no Move.",
      );
    }

    if (matchedProfiles.length > 1) {
      throw new ApiError(
        409,
        "student_email_ambiguous",
        "Encontramos mais de um profile com esse e-mail. Ajuste o dado antes de vincular esse aluno.",
      );
    }

    const studentProfileRecord = matchedProfiles[0];

    if (studentProfileRecord.id === identity.userId) {
      throw new ApiError(
        400,
        "self_relationship_not_allowed",
        "Você não pode se vincular como seu próprio aluno.",
      );
    }

    const studentProfile = await this.profileRepository.findStudentProfileByUserId(studentProfileRecord.id);

    if (!studentProfile) {
      throw new ApiError(
        409,
        "student_role_required",
        "O e-mail informado existe, mas ainda não possui perfil de aluno no Move.",
      );
    }

    const existingRelationship = await this.profileRepository.findOpenRelationshipByPair(
      studentProfileRecord.id,
      identity.userId,
    );

    if (existingRelationship?.status === "active") {
      throw new ApiError(
        409,
        "student_already_linked",
        "Esse aluno já está vinculado a você.",
      );
    }

    if (existingRelationship?.status === "pending") {
      throw new ApiError(
        409,
        "student_link_pending",
        "Esse aluno já possui um vínculo pendente com você.",
      );
    }

    // Reactivate an existing ended relationship in place (instead of creating a new row).
    const latestRelationship = await this.profileRepository.findLatestRelationshipByPair(
      studentProfileRecord.id,
      identity.userId,
    );

    if (latestRelationship && latestRelationship.status === "ended") {
      const reactivated = await this.profileRepository.reactivateRelationshipById(
        latestRelationship.id,
      );

      if (reactivated) {
        await this.appendRelationshipReactivatedEvent({
          relationshipId: reactivated.id,
          cycleKey: reactivated.started_at ?? reactivated.updated_at,
          trainerUserId: identity.userId,
          studentUserId: studentProfileRecord.id,
          actorUserId: identity.userId,
          actorRole: "trainer",
          source: "web",
          metadata: {
            relationshipSource: "manual",
            studentEmail: studentProfileRecord.email ?? normalizedEmail,
          },
        });
      }

      const reactivatedMe = await this.getCurrentUserProfile(identity);

      return {
        me: reactivatedMe,
        student: {
          userId: studentProfileRecord.id,
          fullName: resolveStudentDisplayName(studentProfileRecord.full_name, input.studentName),
          email: studentProfileRecord.email ?? normalizedEmail,
          relationshipStatus: "active",
        },
      };
    }

    const now = new Date().toISOString();
    const relationship = await this.profileRepository.createStudentTrainerRelationship({
      studentUserId: studentProfileRecord.id,
      trainerUserId: identity.userId,
      status: "active",
      source: "manual",
      approvedAt: now,
      startedAt: now,
    });

    await this.appendRelationshipActivatedEvent({
      relationshipId: relationship.id,
      trainerUserId: identity.userId,
      studentUserId: studentProfileRecord.id,
      actorUserId: identity.userId,
      actorRole: "trainer",
      source: "web",
      metadata: {
        relationshipSource: "manual",
        studentEmail: studentProfileRecord.email ?? normalizedEmail,
      },
    });

    const updatedMe = await this.getCurrentUserProfile(identity);

    return {
      me: updatedMe,
      student: {
        userId: studentProfileRecord.id,
        fullName: resolveStudentDisplayName(studentProfileRecord.full_name, input.studentName),
        email: studentProfileRecord.email ?? normalizedEmail,
        relationshipStatus: relationship.status,
      },
    };
  }

  async selectInitialRole(
    identity: CurrentUserIdentity,
    input: RoleSelectionInput,
  ): Promise<MeResponse> {
    const currentMe = await this.getCurrentUserProfile(identity);
    assertRoleSelectionAvailable(currentMe);

    const fullName = resolveFullName({
      preferredName: input.fullName,
      existingName: currentMe.profile?.full_name,
      email: identity.email,
    });

    await this.profileRepository.upsertProfile({
      id: identity.userId,
      fullName,
      email: identity.email,
    });

    if (input.role === "student") {
      await this.profileRepository.upsertStudentProfile({
        userId: identity.userId,
        onboardingCompletedAt: null,
      });
    } else {
      await this.profileRepository.upsertTrainerProfile({
        userId: identity.userId,
        displayName: fullName,
        specialties: [],
        activatedAt: null,
      });
    }

    return this.getCurrentUserProfile(identity);
  }

  async upsertStudentOnboarding(
    identity: CurrentUserIdentity,
    input: StudentOnboardingInput,
  ): Promise<MeResponse> {
    const currentMe = await this.getCurrentUserProfile(identity);
    assertExclusiveRoleAccess("student", currentMe);

    const onboardingCompletedAt = new Date().toISOString();
    const fullName = resolveFullName({
      preferredName: input.fullName,
      existingName: currentMe.profile?.full_name,
      email: identity.email,
    });

    await this.profileRepository.upsertProfile({
      id: identity.userId,
      fullName,
      email: identity.email,
    });

    await this.profileRepository.upsertStudentProfile({
      userId: identity.userId,
      birthDate: input.birthDate,
      sex: input.sex,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      trainingGoal: input.trainingGoal,
      trainingLevel: input.trainingLevel,
      trainingProfile: input.trainingProfile,
      onboardingCompletedAt,
    });

    return this.getCurrentUserProfile(identity);
  }

  async upsertTrainerOnboarding(
    identity: CurrentUserIdentity,
    input: TrainerOnboardingInput,
  ): Promise<MeResponse> {
    const currentMe = await this.getCurrentUserProfile(identity);
    assertExclusiveRoleAccess("trainer", currentMe);

    const activatedAt = new Date().toISOString();
    const fullName = resolveFullName({
      preferredName: input.professionalName,
      existingName: currentMe.profile?.full_name,
      email: identity.email,
    });

    await this.profileRepository.upsertProfile({
      id: identity.userId,
      fullName,
      email: identity.email,
    });

    await this.profileRepository.upsertTrainerProfile({
      userId: identity.userId,
      displayName: input.professionalName,
      bio: input.bio,
      specialties: input.specialties,
      studentCountRange: input.studentCountRange,
      workModel: input.workModel,
      activatedAt,
    });

    return this.getCurrentUserProfile(identity);
  }

  /**
   * Ensures the trainer has an invite_slug. If missing, generates one and persists it.
   * Returns the current (or newly created) slug.
   */
  async ensureInviteSlug(identity: CurrentUserIdentity): Promise<string> {
    const currentMe = await this.getCurrentUserProfile(identity);
    assertTrainerCanManageStudents(currentMe);

    const existingSlug = currentMe.trainerProfile?.invite_slug;

    if (existingSlug) {
      return existingSlug;
    }

    const newSlug = generateInviteSlug();
    await this.profileRepository.updateInviteSlug({
      userId: identity.userId,
      inviteSlug: newSlug,
    });

    return newSlug;
  }

  /**
   * Public: returns display name + specialties for a trainer by invite slug.
   */
  async getTrainerPublicBySlug(inviteSlug: string): Promise<TrainerPublicProfile> {
    const trainerProfile = await this.profileRepository.findTrainerByInviteSlug(inviteSlug);

    if (!trainerProfile) {
      throw new ApiError(404, "invite_not_found", "Convite não encontrado.");
    }

    if (!trainerProfile.activated_at) {
      throw new ApiError(404, "invite_not_found", "Convite não encontrado.");
    }

    return {
      displayName: trainerProfile.display_name?.trim() || "Personal Move",
      specialties: trainerProfile.specialties ?? [],
    };
  }

  /**
   * Authenticated: student accepts an invite link from a trainer.
   */
  async acceptInvite(
    identity: CurrentUserIdentity,
    inviteSlug: string,
  ): Promise<AcceptInviteResponse> {
    const trainerProfile = await this.profileRepository.findTrainerByInviteSlug(inviteSlug);

    if (!trainerProfile) {
      throw new ApiError(404, "invite_not_found", "Convite não encontrado.");
    }

    if (!trainerProfile.activated_at) {
      throw new ApiError(404, "invite_not_found", "Convite não encontrado.");
    }

    // Student cannot be the trainer themselves
    if (trainerProfile.user_id === identity.userId) {
      throw new ApiError(
        400,
        "self_relationship_not_allowed",
        "Você não pode aceitar seu próprio convite.",
      );
    }

    // Student must have a student profile
    const studentProfile = await this.profileRepository.findStudentProfileByUserId(
      identity.userId,
    );

    if (!studentProfile) {
      throw new ApiError(
        409,
        "student_role_required",
        "Você precisa ter um perfil de aluno para aceitar o convite.",
      );
    }

    // Check existing relationship
    const existingRelationship = await this.profileRepository.findOpenRelationshipByPair(
      identity.userId,
      trainerProfile.user_id,
    );

    if (existingRelationship?.status === "active") {
      throw new ApiError(
        409,
        "student_already_linked",
        "Você já está vinculado a esse personal.",
      );
    }

    if (existingRelationship?.status === "pending") {
      throw new ApiError(
        409,
        "student_link_pending",
        "Você já possui um vínculo pendente com esse personal.",
      );
    }

    // Reactivate an existing ended relationship in place (instead of creating a new row).
    const latestRelationship = await this.profileRepository.findLatestRelationshipByPair(
      identity.userId,
      trainerProfile.user_id,
    );

    if (latestRelationship && latestRelationship.status === "ended") {
      const reactivated = await this.profileRepository.reactivateRelationshipById(
        latestRelationship.id,
      );

      if (reactivated) {
        await this.appendRelationshipReactivatedEvent({
          relationshipId: reactivated.id,
          cycleKey: reactivated.started_at ?? reactivated.updated_at,
          trainerUserId: trainerProfile.user_id,
          studentUserId: identity.userId,
          actorUserId: identity.userId,
          actorRole: "student",
          source: "invite_link",
          metadata: {
            inviteSlug,
            relationshipSource: "invite_link",
          },
        });
      }

      return {
        trainer: {
          displayName: trainerProfile.display_name?.trim() || "Personal Move",
          specialties: trainerProfile.specialties ?? [],
        },
        relationshipStatus: "active",
      };
    }

    const now = new Date().toISOString();
    const relationship = await this.profileRepository.createStudentTrainerRelationship({
      studentUserId: identity.userId,
      trainerUserId: trainerProfile.user_id,
      status: "active",
      source: "invite_link",
      approvedAt: now,
      startedAt: now,
    });

    await this.appendRelationshipActivatedEvent({
      relationshipId: relationship.id,
      trainerUserId: trainerProfile.user_id,
      studentUserId: identity.userId,
      actorUserId: identity.userId,
      actorRole: "student",
      source: "invite_link",
      metadata: {
        inviteSlug,
        relationshipSource: "invite_link",
      },
    });

    return {
      trainer: {
        displayName: trainerProfile.display_name?.trim() || "Personal Move",
        specialties: trainerProfile.specialties ?? [],
      },
      relationshipStatus: relationship.status,
    };
  }

  async endRelationshipByTrainer(
    identity: CurrentUserIdentity,
    studentUserId: string,
  ): Promise<{ status: "ended" }> {
    const relationship = await this.profileRepository.findOpenRelationshipByPair(
      studentUserId,
      identity.userId,
    );

    if (!relationship || relationship.status !== "active") {
      throw new ApiError(
        404,
        "relationship_not_found",
        "Vínculo ativo não encontrado para esse aluno.",
      );
    }

    await this.profileRepository.endRelationshipById(relationship.id);

    await this.appendRelationshipEndedEvent({
      eventType: "relationship_removed_by_trainer",
      relationshipId: relationship.id,
      trainerUserId: identity.userId,
      studentUserId,
      actorUserId: identity.userId,
      actorRole: "trainer",
    });

    return { status: "ended" };
  }

  async leaveTrainerByStudent(
    identity: CurrentUserIdentity,
    trainerUserId: string,
  ): Promise<{ status: "ended" }> {
    const relationship = await this.profileRepository.findOpenRelationshipByPair(
      identity.userId,
      trainerUserId,
    );

    if (!relationship || relationship.status !== "active") {
      throw new ApiError(
        404,
        "relationship_not_found",
        "Vínculo ativo não encontrado com esse personal.",
      );
    }

    await this.profileRepository.endRelationshipById(relationship.id);

    await this.appendRelationshipEndedEvent({
      eventType: "relationship_left_by_student",
      relationshipId: relationship.id,
      trainerUserId,
      studentUserId: identity.userId,
      actorUserId: identity.userId,
      actorRole: "student",
    });

    return { status: "ended" };
  }

  /**
   * Append-only audit write for a successful relationship activation.
   * Failure is surfaced explicitly (this event is the future base for audit/billing),
   * except a duplicate idempotency_key, which is treated as an idempotent success.
   */
  private async appendRelationshipActivatedEvent(input: {
    relationshipId: string;
    trainerUserId: string;
    studentUserId: string;
    actorUserId: string;
    actorRole: RelationshipEventActorRole;
    source: RelationshipEventSource;
    metadata: Record<string, string>;
  }): Promise<void> {
    try {
      await this.profileRepository.appendRelationshipEvent({
        eventType: "relationship_activated",
        relationshipId: input.relationshipId,
        trainerUserId: input.trainerUserId,
        studentUserId: input.studentUserId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        source: input.source,
        metadata: input.metadata,
        idempotencyKey: `relationship_activated:${input.relationshipId}`,
      });
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === "relationship_event_duplicate") {
        return;
      }

      throw error;
    }
  }

  /**
   * Append-only audit write for a relationship ending (trainer removal / student leaving).
   * A duplicate idempotency_key is treated as an idempotent success; other errors surface.
   */
  private async appendRelationshipEndedEvent(input: {
    eventType: "relationship_removed_by_trainer" | "relationship_left_by_student";
    relationshipId: string;
    trainerUserId: string;
    studentUserId: string;
    actorUserId: string;
    actorRole: RelationshipEventActorRole;
  }): Promise<void> {
    try {
      await this.profileRepository.appendRelationshipEvent({
        eventType: input.eventType,
        relationshipId: input.relationshipId,
        trainerUserId: input.trainerUserId,
        studentUserId: input.studentUserId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        source: "web",
        idempotencyKey: `${input.eventType}:${input.relationshipId}`,
      });
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === "relationship_event_duplicate") {
        return;
      }

      throw error;
    }
  }

  /**
   * Append-only audit write for a relationship reactivation (ended -> active).
   * The idempotency_key embeds a per-cycle discriminator (the reactivation timestamp)
   * so multiple reactivation cycles of the same relationship are recorded distinctly.
   * A duplicate idempotency_key is treated as an idempotent success; other errors surface.
   */
  private async appendRelationshipReactivatedEvent(input: {
    relationshipId: string;
    cycleKey: string;
    trainerUserId: string;
    studentUserId: string;
    actorUserId: string;
    actorRole: RelationshipEventActorRole;
    source: RelationshipEventSource;
    metadata: Record<string, string>;
  }): Promise<void> {
    try {
      await this.profileRepository.appendRelationshipEvent({
        eventType: "relationship_reactivated",
        relationshipId: input.relationshipId,
        trainerUserId: input.trainerUserId,
        studentUserId: input.studentUserId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        source: input.source,
        metadata: input.metadata,
        idempotencyKey: `relationship_reactivated:${input.relationshipId}:${input.cycleKey}`,
      });
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === "relationship_event_duplicate") {
        return;
      }

      throw error;
    }
  }

  async getCurrentUserProfile(identity: CurrentUserIdentity): Promise<MeResponse> {
    const [profile, studentProfile, trainerProfile, relationships] = await Promise.all([
      this.profileRepository.findProfileByUserId(identity.userId),
      this.profileRepository.findStudentProfileByUserId(identity.userId),
      this.profileRepository.findTrainerProfileByUserId(identity.userId),
      this.profileRepository.findRelationshipsByUserId(identity.userId),
    ]);

    const isStudent = studentProfile !== null;
    const isTrainer = trainerProfile !== null;
    const primaryRole = resolvePrimaryRole(isStudent, isTrainer);
    const studentOnboardingCompleted = isStudentOnboardingCompleted(studentProfile);
    const trainerOnboardingCompleted = isTrainerOnboardingCompleted(trainerProfile);
    const nextStep = resolveNextStep({
      isStudent,
      isTrainer,
      primaryRole,
      studentOnboardingCompleted,
      trainerOnboardingCompleted,
    });

    let studentStats: StudentStats | null = null;

    if (isStudent) {
      const [assignedWorkoutCount, completedSessionCount] = await Promise.all([
        this.profileRepository.countAssignedWorkoutsForStudent(identity.userId),
        this.profileRepository.countCompletedSessionsForStudent(identity.userId),
      ]);

      studentStats = { assignedWorkoutCount, completedSessionCount };
    }

    return {
      user: {
        id: identity.userId,
        email: identity.email,
      },
      profile,
      studentProfile,
      trainerProfile,
      relationships,
      isStudent,
      isTrainer,
      isAdmin: isAdminEmail(identity.email) && isTrainer,
      primaryRole,
      studentOnboardingCompleted,
      trainerOnboardingCompleted,
      studentStats,
      nextStep,
    };
  }
}