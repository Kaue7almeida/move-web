import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { Database } from "@/bff/core/supabase/database.types";
import type { IProfileRepository } from "@/bff/modules/profile/types/IProfileRepository";
import type {
  AppendRelationshipEventInput,
  CreateStudentTrainerRelationshipInput,
  ProfileRecord,
  RelationshipEventRecord,
  StudentProfileRecord,
  StudentTrainerRelationshipRecord,
  TrainerProfileRecord,
  UpdateInviteSlugInput,
  UpsertProfileInput,
  UpsertStudentProfileInput,
  UpsertTrainerProfileInput,
} from "@/bff/modules/profile/types";

export class ProfileRepository implements IProfileRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findProfilesByEmail(email: string): Promise<ProfileRecord[]> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .ilike("email", email)
      .limit(2);

    if (error) {
      throw new ApiError(500, "profile_lookup_failed", "Não foi possível localizar o profile por e-mail.");
    }

    return data ?? [];
  }

  async upsertProfile(input: UpsertProfileInput): Promise<void> {
    const payload: Database["public"]["Tables"]["profiles"]["Insert"] = {
      id: input.id,
      full_name: input.fullName,
      ...(input.email !== undefined ? { email: input.email } : {}),
    };

    const { error } = await this.supabase.from("profiles").upsert(payload, { onConflict: "id" });

    if (error) {
      throw new ApiError(500, "profile_upsert_failed", "Não foi possível salvar o profile.");
    }
  }

  async upsertStudentProfile(input: UpsertStudentProfileInput): Promise<void> {
    const payload: Database["public"]["Tables"]["student_profiles"]["Insert"] = {
      user_id: input.userId,
      birth_date: input.birthDate ?? null,
      sex: input.sex ?? null,
      weight_kg: input.weightKg ?? null,
      height_cm: input.heightCm ?? null,
      training_goal: input.trainingGoal ?? null,
      training_level: input.trainingLevel ?? null,
      training_profile: input.trainingProfile ?? null,
      onboarding_completed_at: input.onboardingCompletedAt ?? null,
    };

    const { error } = await this.supabase
      .from("student_profiles")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      throw new ApiError(
        500,
        "student_profile_upsert_failed",
        "Não foi possível salvar o student profile.",
      );
    }
  }

  async upsertTrainerProfile(input: UpsertTrainerProfileInput): Promise<void> {
    const payload: Database["public"]["Tables"]["trainer_profiles"]["Insert"] = {
      user_id: input.userId,
      display_name: input.displayName ?? null,
      bio: input.bio ?? null,
      specialties: input.specialties ?? [],
      student_count_range: input.studentCountRange ?? null,
      work_model: input.workModel ?? null,
      ...(input.inviteSlug !== undefined ? { invite_slug: input.inviteSlug } : {}),
      activated_at: input.activatedAt ?? null,
    };

    const { error } = await this.supabase
      .from("trainer_profiles")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      throw new ApiError(
        500,
        "trainer_profile_upsert_failed",
        "Não foi possível salvar o trainer profile.",
      );
    }
  }

  async findProfileByUserId(userId: string): Promise<ProfileRecord | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new ApiError(500, "profile_fetch_failed", "Não foi possível carregar o profile.");
    }

    return data;
  }

  async findStudentProfileByUserId(userId: string): Promise<StudentProfileRecord | null> {
    const { data, error } = await this.supabase
      .from("student_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new ApiError(
        500,
        "student_profile_fetch_failed",
        "Não foi possível carregar o student profile.",
      );
    }

    return data;
  }

  async findTrainerProfileByUserId(userId: string): Promise<TrainerProfileRecord | null> {
    const { data, error } = await this.supabase
      .from("trainer_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new ApiError(
        500,
        "trainer_profile_fetch_failed",
        "Não foi possível carregar o trainer profile.",
      );
    }

    return data;
  }

  async findStudentProfilesForTrainer(
    trainerUserId: string,
  ): Promise<
    Array<{
      relationship: StudentTrainerRelationshipRecord;
      profile: ProfileRecord | null;
    }>
  > {
    const { data: relationships, error: relError } = await this.supabase
      .from("student_trainer_relationships")
      .select("*")
      .eq("trainer_user_id", trainerUserId)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false });

    if (relError) {
      throw new ApiError(
        500,
        "trainer_students_fetch_failed",
        "Não foi possível carregar os alunos vinculados.",
      );
    }

    if (!relationships || relationships.length === 0) {
      return [];
    }

    const studentUserIds = relationships.map((r) => r.student_user_id);

    const { data: profiles, error: profilesError } = await this.supabase
      .from("profiles")
      .select("*")
      .in("id", studentUserIds);

    if (profilesError) {
      throw new ApiError(
        500,
        "student_profiles_fetch_failed",
        "Não foi possível carregar os perfis dos alunos.",
      );
    }

    const profileMap = new Map<string, ProfileRecord>();

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, profile);
    }

    return relationships.map((relationship) => ({
      relationship,
      profile: profileMap.get(relationship.student_user_id) ?? null,
    }));
  }

  async findRelationshipsByUserId(userId: string): Promise<StudentTrainerRelationshipRecord[]> {
    const { data, error } = await this.supabase
      .from("student_trainer_relationships")
      .select("*")
      .or(`student_user_id.eq.${userId},trainer_user_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      throw new ApiError(
        500,
        "relationships_fetch_failed",
        "Não foi possível carregar os relacionamentos do usuário.",
      );
    }

    return data ?? [];
  }

  async countAssignedWorkoutsForStudent(studentUserId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("student_workouts")
      .select("*", { count: "exact", head: true })
      .eq("student_user_id", studentUserId)
      .in("status", ["active", "pending"]);

    if (error) {
      throw new ApiError(
        500,
        "student_workouts_count_failed",
        "Não foi possível contar os treinos do aluno.",
      );
    }

    return count ?? 0;
  }

  async countCompletedSessionsForStudent(studentUserId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("workout_sessions")
      .select("*", { count: "exact", head: true })
      .eq("student_user_id", studentUserId)
      .eq("status", "completed");

    if (error) {
      throw new ApiError(
        500,
        "workout_sessions_count_failed",
        "Não foi possível contar as sessões do aluno.",
      );
    }

    return count ?? 0;
  }

  async findOpenRelationshipByPair(
    studentUserId: string,
    trainerUserId: string,
  ): Promise<StudentTrainerRelationshipRecord | null> {
    const { data, error } = await this.supabase
      .from("student_trainer_relationships")
      .select("*")
      .eq("student_user_id", studentUserId)
      .eq("trainer_user_id", trainerUserId)
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new ApiError(
        500,
        "relationship_lookup_failed",
        "Não foi possível verificar relacionamentos existentes para esse aluno.",
      );
    }

    return data;
  }

  async createStudentTrainerRelationship(
    input: CreateStudentTrainerRelationshipInput,
  ): Promise<StudentTrainerRelationshipRecord> {
    const payload: Database["public"]["Tables"]["student_trainer_relationships"]["Insert"] = {
      student_user_id: input.studentUserId,
      trainer_user_id: input.trainerUserId,
      status: input.status,
      source: input.source,
      visibility_settings: input.visibilitySettings ?? {},
      approved_at: input.approvedAt ?? null,
      started_at: input.startedAt ?? null,
      ended_at: input.endedAt ?? null,
      billing_eligible_from: input.billingEligibleFrom ?? null,
    };

    const { data, error } = await this.supabase
      .from("student_trainer_relationships")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new ApiError(
          409,
          "relationship_already_exists",
          "Já existe um relacionamento ativo ou pendente com esse aluno.",
        );
      }

      throw new ApiError(
        500,
        "relationship_create_failed",
        "Não foi possível criar o relacionamento com o aluno.",
      );
    }

    return data;
  }

  async findLatestRelationshipByPair(
    studentUserId: string,
    trainerUserId: string,
  ): Promise<StudentTrainerRelationshipRecord | null> {
    const { data, error } = await this.supabase
      .from("student_trainer_relationships")
      .select("*")
      .eq("student_user_id", studentUserId)
      .eq("trainer_user_id", trainerUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new ApiError(
        500,
        "relationship_lookup_failed",
        "Não foi possível verificar relacionamentos existentes para esse par.",
      );
    }

    return data;
  }

  async reactivateRelationshipById(
    relationshipId: string,
  ): Promise<StudentTrainerRelationshipRecord | null> {
    const now = new Date().toISOString();
    const payload: Database["public"]["Tables"]["student_trainer_relationships"]["Update"] = {
      status: "active",
      ended_at: null,
      started_at: now,
      approved_at: now,
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .from("student_trainer_relationships")
      .update(payload)
      .eq("id", relationshipId)
      .eq("status", "ended")
      .select("*")
      .maybeSingle();

    if (error) {
      throw new ApiError(
        500,
        "relationship_reactivate_failed",
        "Não foi possível reativar o vínculo aluno-personal.",
      );
    }

    return data;
  }

  async endRelationshipById(relationshipId: string): Promise<void> {
    const now = new Date().toISOString();
    const payload: Database["public"]["Tables"]["student_trainer_relationships"]["Update"] = {
      status: "ended",
      ended_at: now,
      updated_at: now,
    };

    const { error } = await this.supabase
      .from("student_trainer_relationships")
      .update(payload)
      .eq("id", relationshipId)
      .eq("status", "active");

    if (error) {
      throw new ApiError(
        500,
        "relationship_end_failed",
        "Não foi possível encerrar o vínculo aluno-personal.",
      );
    }
  }

  async appendRelationshipEvent(
    input: AppendRelationshipEventInput,
  ): Promise<RelationshipEventRecord> {
    const payload: Database["public"]["Tables"]["student_trainer_relationship_events"]["Insert"] = {
      event_type: input.eventType,
      trainer_user_id: input.trainerUserId,
      student_user_id: input.studentUserId ?? null,
      relationship_id: input.relationshipId ?? null,
      actor_user_id: input.actorUserId ?? null,
      actor_role: input.actorRole,
      source: input.source,
      metadata: input.metadata ?? {},
      idempotency_key: input.idempotencyKey ?? null,
      occurred_at: input.occurredAt ?? undefined,
    };

    const { data, error } = await this.supabase
      .from("student_trainer_relationship_events")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new ApiError(
          409,
          "relationship_event_duplicate",
          "Já existe um evento de relação com essa chave de idempotência.",
        );
      }

      throw new ApiError(
        500,
        "relationship_event_append_failed",
        "Não foi possível registrar o evento da relação.",
      );
    }

    return data;
  }

  async findTrainerByInviteSlug(
    inviteSlug: string,
  ): Promise<TrainerProfileRecord | null> {
    const { data, error } = await this.supabase
      .from("trainer_profiles")
      .select("*")
      .eq("invite_slug", inviteSlug)
      .maybeSingle();

    if (error) {
      throw new ApiError(
        500,
        "trainer_invite_lookup_failed",
        "Não foi possível localizar o convite.",
      );
    }

    return data;
  }

  async updateInviteSlug(input: UpdateInviteSlugInput): Promise<void> {
    const { error } = await this.supabase
      .from("trainer_profiles")
      .update({ invite_slug: input.inviteSlug })
      .eq("user_id", input.userId);

    if (error) {
      throw new ApiError(
        500,
        "invite_slug_update_failed",
        "Não foi possível salvar o link de convite.",
      );
    }
  }
}