import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { Database } from "@/bff/core/supabase/database.types";
import type { IAdminRepository } from "@/bff/modules/admin/types/IAdminRepository";

const QUERY_FAILED = new ApiError(
  500,
  "admin_overview_query_failed",
  "Não foi possível carregar as métricas do admin.",
);

const SCANS_QUERY_FAILED = new ApiError(
  500,
  "admin_scans_query_failed",
  "Não foi possível carregar as análises de scan.",
);

const TRAINERS_QUERY_FAILED = new ApiError(
  500,
  "admin_trainers_query_failed",
  "Não foi possível carregar os personais.",
);

export class AdminRepository implements IAdminRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async countTrainerProfiles(): Promise<number> {
    const { count, error } = await this.supabase
      .from("trainer_profiles")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw QUERY_FAILED;
    }

    return count ?? 0;
  }

  async countInternalTrainerProfiles(): Promise<number> {
    const { count, error } = await this.supabase
      .from("trainer_profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_internal_move_trainer", true);

    if (error) {
      throw QUERY_FAILED;
    }

    return count ?? 0;
  }

  async countStudentProfiles(): Promise<number> {
    const { count, error } = await this.supabase
      .from("student_profiles")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw QUERY_FAILED;
    }

    return count ?? 0;
  }

  async countRelationshipsByStatus(status: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("student_trainer_relationships")
      .select("*", { count: "exact", head: true })
      .eq("status", status);

    if (error) {
      throw QUERY_FAILED;
    }

    return count ?? 0;
  }

  async countDistinctActiveStudents(): Promise<number> {
    const { data, error } = await this.supabase
      .from("student_trainer_relationships")
      .select("student_user_id")
      .eq("status", "active");

    if (error) {
      throw QUERY_FAILED;
    }

    return new Set((data ?? []).map((row) => row.student_user_id)).size;
  }

  async countEventsSince(sinceIso: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("student_trainer_relationship_events")
      .select("*", { count: "exact", head: true })
      .gte("occurred_at", sinceIso);

    if (error) {
      throw QUERY_FAILED;
    }

    return count ?? 0;
  }

  async countEventsByTypeSince(sinceIso: string): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from("student_trainer_relationship_events")
      .select("event_type")
      .gte("occurred_at", sinceIso);

    if (error) {
      throw QUERY_FAILED;
    }

    const tally: Record<string, number> = {};

    for (const row of data ?? []) {
      tally[row.event_type] = (tally[row.event_type] ?? 0) + 1;
    }

    return tally;
  }

  async countEventsOfTypeSince(eventType: string, sinceIso: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("student_trainer_relationship_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", eventType)
      .gte("occurred_at", sinceIso);

    if (error) {
      throw QUERY_FAILED;
    }

    return count ?? 0;
  }

  /** Treinos atribuidos a alunos (pendentes ou ativos; cancelados ficam fora). */
  async countAssignedStudentWorkouts(): Promise<number> {
    const { count, error } = await this.supabase
      .from("student_workouts")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "active"]);

    if (error) {
      throw QUERY_FAILED;
    }

    return count ?? 0;
  }

  async countCompletedWorkoutSessions(sinceIso?: string): Promise<number> {
    let query = this.supabase
      .from("workout_sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    if (sinceIso) {
      query = query.gte("completed_at", sinceIso);
    }

    const { count, error } = await query;

    if (error) {
      throw QUERY_FAILED;
    }

    return count ?? 0;
  }

  async countCompletedScans(): Promise<number> {
    const { count, error } = await this.supabase
      .from("scan_analyses")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    if (error) {
      throw QUERY_FAILED;
    }

    return count ?? 0;
  }

  /** Scans criados no periodo (mesmo criterio do analysesLast30Days do modulo de scans). */
  async countScansSince(sinceIso: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("scan_analyses")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceIso);

    if (error) {
      throw QUERY_FAILED;
    }

    return count ?? 0;
  }

  /** Mensagens escritas por humanos (aluno ou personal); respostas de IA ficam fora. */
  async countHumanChatMessages(sinceIso?: string): Promise<number> {
    let query = this.supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("role", "user")
      .is("deleted_at", null);

    if (sinceIso) {
      query = query.gte("created_at", sinceIso);
    }

    const { count, error } = await query;

    if (error) {
      throw QUERY_FAILED;
    }

    return count ?? 0;
  }

  async countWaitingForTrainerConversations(): Promise<number> {
    const { count, error } = await this.supabase
      .from("chat_conversations")
      .select("*", { count: "exact", head: true })
      .eq("conversation_type", "trainer_chat")
      .eq("waiting_for_trainer", true)
      .is("deleted_at", null);

    if (error) {
      throw QUERY_FAILED;
    }

    return count ?? 0;
  }

  async listActiveRelationships(): Promise<
    Array<{
      student_user_id: string;
      trainer_user_id: string;
      started_at: string | null;
    }>
  > {
    const { data, error } = await this.supabase
      .from("student_trainer_relationships")
      .select("student_user_id, trainer_user_id, started_at")
      .eq("status", "active");

    if (error) {
      throw QUERY_FAILED;
    }

    return data ?? [];
  }

  /** Referencias (aluno, personal) dos treinos atribuidos nao cancelados. */
  async listAssignedStudentWorkoutRefs(): Promise<
    Array<{ student_user_id: string; trainer_user_id: string }>
  > {
    const { data, error } = await this.supabase
      .from("student_workouts")
      .select("student_user_id, trainer_user_id")
      .in("status", ["pending", "active"]);

    if (error) {
      throw QUERY_FAILED;
    }

    return data ?? [];
  }

  async listStudentIdsWithCompletedSessionsSince(sinceIso: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("workout_sessions")
      .select("student_user_id")
      .eq("status", "completed")
      .gte("completed_at", sinceIso);

    if (error) {
      throw QUERY_FAILED;
    }

    return Array.from(new Set((data ?? []).map((row) => row.student_user_id)));
  }

  /**
   * Sessoes concluidas (mais recentes primeiro) apenas dos alunos candidatos.
   * Chamado com listas curtas (<= 50 ids); o limite e uma protecao extra.
   */
  async listLastCompletedSessionAtForStudents(
    studentUserIds: string[],
  ): Promise<Array<{ student_user_id: string; completed_at: string | null }>> {
    if (studentUserIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("workout_sessions")
      .select("student_user_id, completed_at")
      .eq("status", "completed")
      .in("student_user_id", studentUserIds)
      .order("completed_at", { ascending: false })
      .limit(500);

    if (error) {
      throw QUERY_FAILED;
    }

    return data ?? [];
  }

  async listTrainerUserIdsWithActiveTemplates(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("workout_templates")
      .select("trainer_user_id")
      .eq("status", "active");

    if (error) {
      throw QUERY_FAILED;
    }

    return Array.from(new Set((data ?? []).map((row) => row.trainer_user_id)));
  }

  async listTrainers(): Promise<
    Array<{
      user_id: string;
      display_name: string | null;
      activated_at: string | null;
      is_internal_move_trainer: boolean;
    }>
  > {
    const { data, error } = await this.supabase
      .from("trainer_profiles")
      .select("user_id, display_name, activated_at, is_internal_move_trainer");

    if (error) {
      throw TRAINERS_QUERY_FAILED;
    }

    return data ?? [];
  }

  async listProfileEmailsByIds(
    userIds: string[],
  ): Promise<Array<{ id: string; email: string | null }>> {
    if (userIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

    if (error) {
      throw TRAINERS_QUERY_FAILED;
    }

    return data ?? [];
  }

  async listTrainerRelationshipStatuses(): Promise<
    Array<{ trainer_user_id: string; status: string }>
  > {
    const { data, error } = await this.supabase
      .from("student_trainer_relationships")
      .select("trainer_user_id, status");

    if (error) {
      throw TRAINERS_QUERY_FAILED;
    }

    return data ?? [];
  }

  async findTrainerProfileById(userId: string): Promise<{
    user_id: string;
    display_name: string | null;
    activated_at: string | null;
    is_internal_move_trainer: boolean;
  } | null> {
    const { data, error } = await this.supabase
      .from("trainer_profiles")
      .select("user_id, display_name, activated_at, is_internal_move_trainer")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw TRAINERS_QUERY_FAILED;
    }

    return data;
  }

  async listProfilesByIds(
    userIds: string[],
  ): Promise<Array<{ id: string; full_name: string | null; email: string | null }>> {
    if (userIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    if (error) {
      throw TRAINERS_QUERY_FAILED;
    }

    return data ?? [];
  }

  async listRelationshipsForTrainer(trainerUserId: string): Promise<
    Array<{
      student_user_id: string;
      status: string;
      started_at: string | null;
      ended_at: string | null;
    }>
  > {
    const { data, error } = await this.supabase
      .from("student_trainer_relationships")
      .select("student_user_id, status, started_at, ended_at")
      .eq("trainer_user_id", trainerUserId);

    if (error) {
      throw TRAINERS_QUERY_FAILED;
    }

    return data ?? [];
  }

  async listAllScanRecords(): Promise<
    Array<{
      id: string;
      student_user_id: string;
      status: string;
      allowance_type: string;
      created_at: string;
      processed_at: string | null;
      body_fat_percent: number | null;
      quality_overall: string | null;
    }>
  > {
    const { data, error } = await this.supabase
      .from("scan_analyses")
      .select(
        "id, student_user_id, status, allowance_type, created_at, processed_at, body_fat_percent, quality_overall",
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw SCANS_QUERY_FAILED;
    }

    return data ?? [];
  }

  async listRecentEventsForTrainer(
    trainerUserId: string,
    limit: number,
  ): Promise<
    Array<{
      event_type: string;
      occurred_at: string;
      actor_role: string;
      source: string;
      student_user_id: string | null;
    }>
  > {
    const { data, error } = await this.supabase
      .from("student_trainer_relationship_events")
      .select("event_type, occurred_at, actor_role, source, student_user_id")
      .eq("trainer_user_id", trainerUserId)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw TRAINERS_QUERY_FAILED;
    }

    return data ?? [];
  }
}
