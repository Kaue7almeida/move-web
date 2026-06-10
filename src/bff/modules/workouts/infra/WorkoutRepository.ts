import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/bff/core/errors/ApiError";
import type { Database } from "@/bff/core/supabase/database.types";
import type { TrainerProfileRecord } from "@/bff/modules/profile/types";
import type { IWorkoutRepository } from "@/bff/modules/workouts/types/IWorkoutRepository";
import type {
  CreateStudentWorkoutExerciseRecordInput,
  CreateStudentWorkoutRecordInput,
  CreateWorkoutSessionRecordInput,
  CreateWorkoutSessionSetRecordInput,
  CreateWorkoutTemplateExerciseRecordInput,
  CreateWorkoutTemplateRecordInput,
  ExerciseRecord,
  StudentWorkoutExerciseRecord,
  StudentWorkoutRecord,
  TrainerActiveStudent,
  UpdateWorkoutGalleryInput,
  UpdateWorkoutTemplateRecordInput,
  WorkoutSessionRecord,
  WorkoutSessionSetRecord,
  WorkoutTemplateExerciseRecord,
  WorkoutTemplateRecord,
} from "@/bff/modules/workouts/types";

export class WorkoutRepository implements IWorkoutRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listExercises(): Promise<ExerciseRecord[]> {
    const { data, error } = await this.supabase
      .from("exercises")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      throw new ApiError(500, "exercises_fetch_failed", "Não foi possível carregar a biblioteca de exercícios.");
    }

    return data ?? [];
  }

  async findExercisesByIds(exerciseIds: string[]): Promise<ExerciseRecord[]> {
    if (exerciseIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("exercises")
      .select("*")
      .in("id", exerciseIds)
      .eq("is_active", true);

    if (error) {
      throw new ApiError(500, "exercise_lookup_failed", "Não foi possível validar os exercícios informados.");
    }

    return data ?? [];
  }

  getPublicMediaUrl(path: string | null): string | null {
    if (!path) {
      return null;
    }

    const { data } = this.supabase.storage.from("exercises").getPublicUrl(path);

    return data.publicUrl;
  }

  async findTrainerProfileByUserId(userId: string) {
    const { data, error } = await this.supabase
      .from("trainer_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new ApiError(500, "trainer_profile_fetch_failed", "Não foi possível carregar o perfil do personal.");
    }

    return data;
  }

  async listTrainerWorkoutTemplates(trainerUserId: string): Promise<WorkoutTemplateRecord[]> {
    const { data, error } = await this.supabase
      .from("workout_templates")
      .select("*")
      .eq("trainer_user_id", trainerUserId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new ApiError(500, "trainer_workouts_fetch_failed", "Não foi possível carregar os treinos do personal.");
    }

    return data ?? [];
  }

  async createWorkoutTemplate(input: CreateWorkoutTemplateRecordInput): Promise<WorkoutTemplateRecord> {
    const payload: Database["public"]["Tables"]["workout_templates"]["Insert"] = {
      trainer_user_id: input.trainerUserId,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
    };

    const { data, error } = await this.supabase
      .from("workout_templates")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new ApiError(500, "trainer_workout_create_failed", "Não foi possível criar o treino do personal.");
    }

    return data;
  }

  async updateWorkoutTemplateById(
    workoutId: string,
    trainerUserId: string,
    input: UpdateWorkoutTemplateRecordInput,
  ): Promise<WorkoutTemplateRecord> {
    const payload: Database["public"]["Tables"]["workout_templates"]["Update"] = {
      title: input.title,
      description: input.description ?? null,
      status: input.status,
    };

    const { data, error } = await this.supabase
      .from("workout_templates")
      .update(payload)
      .eq("id", workoutId)
      .eq("trainer_user_id", trainerUserId)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new ApiError(500, "trainer_workout_update_failed", "Não foi possível atualizar o treino do personal.");
    }

    if (!data) {
      throw new ApiError(404, "trainer_workout_not_found", "Treino não encontrado para esse personal.");
    }

    return data;
  }

  async updateWorkoutTemplateGalleryById(
    workoutId: string,
    trainerUserId: string,
    input: UpdateWorkoutGalleryInput,
  ): Promise<WorkoutTemplateRecord> {
    const payload: Database["public"]["Tables"]["workout_templates"]["Update"] = {
      is_in_gallery: input.isInGallery,
      ...(input.galleryCategory !== undefined ? { gallery_category: input.galleryCategory } : {}),
    };

    const { data, error } = await this.supabase
      .from("workout_templates")
      .update(payload)
      .eq("id", workoutId)
      .eq("trainer_user_id", trainerUserId)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new ApiError(
        500,
        "trainer_workout_gallery_update_failed",
        "Não foi possível atualizar a publicação na galeria.",
      );
    }

    if (!data) {
      throw new ApiError(404, "trainer_workout_not_found", "Treino não encontrado para esse personal.");
    }

    return data;
  }

  async createWorkoutTemplateExercises(input: CreateWorkoutTemplateExerciseRecordInput[]): Promise<void> {
    const payload: Database["public"]["Tables"]["workout_template_exercises"]["Insert"][] = input.map(
      (item) => ({
        workout_template_id: item.workoutTemplateId,
        exercise_id: item.exerciseId,
        sort_order: item.sortOrder,
        sets_count: item.setsCount,
        reps_text: item.repsText,
        rest_seconds: item.restSeconds ?? null,
        notes: item.notes ?? null,
      }),
    );

    const { error } = await this.supabase.from("workout_template_exercises").insert(payload);

    if (error) {
      throw new ApiError(
        500,
        "trainer_workout_exercises_create_failed",
        "Não foi possível salvar os exercícios do treino.",
      );
    }
  }

  async deleteWorkoutTemplateExercisesByWorkoutId(workoutId: string): Promise<void> {
    const { error } = await this.supabase
      .from("workout_template_exercises")
      .delete()
      .eq("workout_template_id", workoutId);

    if (error) {
      throw new ApiError(
        500,
        "trainer_workout_exercises_delete_failed",
        "Não foi possível substituir os exercícios do treino.",
      );
    }
  }

  async deleteWorkoutTemplateById(workoutId: string): Promise<void> {
    const { error } = await this.supabase.from("workout_templates").delete().eq("id", workoutId);

    if (error) {
      throw new ApiError(500, "trainer_workout_cleanup_failed", "Não foi possível limpar o treino após falha de gravação.");
    }
  }

  async findTrainerWorkoutTemplateById(
    workoutId: string,
    trainerUserId: string,
  ): Promise<WorkoutTemplateRecord | null> {
    const { data, error } = await this.supabase
      .from("workout_templates")
      .select("*")
      .eq("id", workoutId)
      .eq("trainer_user_id", trainerUserId)
      .maybeSingle();

    if (error) {
      throw new ApiError(500, "trainer_workout_fetch_failed", "Não foi possível carregar esse treino.");
    }

    return data;
  }

  async listWorkoutTemplateExercisesByWorkoutIds(
    workoutIds: string[],
  ): Promise<WorkoutTemplateExerciseRecord[]> {
    if (workoutIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("workout_template_exercises")
      .select("*")
      .in("workout_template_id", workoutIds)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new ApiError(
        500,
        "trainer_workout_exercises_fetch_failed",
        "Não foi possível carregar os exercícios dos treinos.",
      );
    }

    return data ?? [];
  }

  async findActiveRelationship(studentUserId: string, trainerUserId: string) {
    const { data, error } = await this.supabase
      .from("student_trainer_relationships")
      .select("*")
      .eq("student_user_id", studentUserId)
      .eq("trainer_user_id", trainerUserId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      throw new ApiError(
        500,
        "active_relationship_fetch_failed",
        "Não foi possível validar o vínculo entre personal e aluno.",
      );
    }

    return data;
  }

  async createStudentWorkout(input: CreateStudentWorkoutRecordInput): Promise<StudentWorkoutRecord> {
    const payload: Database["public"]["Tables"]["student_workouts"]["Insert"] = {
      trainer_user_id: input.trainerUserId,
      student_user_id: input.studentUserId,
      workout_template_id: input.workoutTemplateId ?? null,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      source: input.source,
      assigned_at: input.assignedAt,
      activated_at: input.activatedAt ?? null,
    };

    const { data, error } = await this.supabase
      .from("student_workouts")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new ApiError(500, "student_workout_create_failed", "Não foi possível aplicar o treino ao aluno.");
    }

    return data;
  }

  async createStudentWorkoutExercises(input: CreateStudentWorkoutExerciseRecordInput[]): Promise<void> {
    const payload: Database["public"]["Tables"]["student_workout_exercises"]["Insert"][] = input.map(
      (item) => ({
        student_workout_id: item.studentWorkoutId,
        exercise_id: item.exerciseId ?? null,
        exercise_name: item.exerciseName,
        sort_order: item.sortOrder,
        sets_count: item.setsCount,
        reps_text: item.repsText,
        rest_seconds: item.restSeconds ?? null,
        notes: item.notes ?? null,
      }),
    );

    const { error } = await this.supabase.from("student_workout_exercises").insert(payload);

    if (error) {
      throw new ApiError(
        500,
        "student_workout_exercises_create_failed",
        "Não foi possível salvar o snapshot dos exercícios aplicados.",
      );
    }
  }

  async deleteStudentWorkoutById(studentWorkoutId: string): Promise<void> {
    const { error } = await this.supabase
      .from("student_workouts")
      .delete()
      .eq("id", studentWorkoutId);

    if (error) {
      throw new ApiError(500, "student_workout_cleanup_failed", "Não foi possível limpar o treino aplicado após falha.");
    }
  }

  async findStudentProfileByUserId(userId: string) {
    const { data, error } = await this.supabase
      .from("student_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new ApiError(500, "student_profile_fetch_failed", "Não foi possível carregar o perfil do aluno.");
    }

    return data;
  }

  async listStudentWorkouts(studentUserId: string): Promise<StudentWorkoutRecord[]> {
    const { data, error } = await this.supabase
      .from("student_workouts")
      .select("*")
      .eq("student_user_id", studentUserId)
      .in("status", ["active", "pending"])
      .order("assigned_at", { ascending: false });

    if (error) {
      throw new ApiError(500, "student_workouts_fetch_failed", "Não foi possível carregar seus treinos.");
    }

    return data ?? [];
  }

  async listActiveTrainerIdsForStudent(studentUserId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("student_trainer_relationships")
      .select("trainer_user_id")
      .eq("student_user_id", studentUserId)
      .eq("status", "active");

    if (error) {
      throw new ApiError(500, "student_trainers_fetch_failed", "Não foi possível carregar seus personais.");
    }

    return Array.from(new Set((data ?? []).map((relationship) => relationship.trainer_user_id)));
  }

  async listGalleryTemplatesForTrainers(trainerUserIds: string[]): Promise<WorkoutTemplateRecord[]> {
    if (trainerUserIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("workout_templates")
      .select("*")
      .in("trainer_user_id", trainerUserIds)
      .eq("is_in_gallery", true)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      throw new ApiError(500, "gallery_templates_fetch_failed", "Não foi possível carregar a galeria.");
    }

    return data ?? [];
  }

  async findTrainerProfilesByIds(trainerUserIds: string[]): Promise<TrainerProfileRecord[]> {
    if (trainerUserIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("trainer_profiles")
      .select("*")
      .in("user_id", trainerUserIds);

    if (error) {
      throw new ApiError(500, "trainer_profiles_fetch_failed", "Não foi possível carregar os personais.");
    }

    return data ?? [];
  }

  async findWorkoutTemplateById(templateId: string): Promise<WorkoutTemplateRecord | null> {
    const { data, error } = await this.supabase
      .from("workout_templates")
      .select("*")
      .eq("id", templateId)
      .maybeSingle();

    if (error) {
      throw new ApiError(500, "workout_template_fetch_failed", "Não foi possível carregar o treino.");
    }

    return data;
  }

  async findStudentWorkoutById(
    studentWorkoutId: string,
    studentUserId: string,
  ): Promise<StudentWorkoutRecord | null> {
    const { data, error } = await this.supabase
      .from("student_workouts")
      .select("*")
      .eq("id", studentWorkoutId)
      .eq("student_user_id", studentUserId)
      .maybeSingle();

    if (error) {
      throw new ApiError(500, "student_workout_fetch_failed", "Não foi possível carregar esse treino.");
    }

    return data;
  }

  async listStudentWorkoutExercisesByWorkoutIds(
    studentWorkoutIds: string[],
  ): Promise<StudentWorkoutExerciseRecord[]> {
    if (studentWorkoutIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("student_workout_exercises")
      .select("*")
      .in("student_workout_id", studentWorkoutIds)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new ApiError(
        500,
        "student_workout_exercises_fetch_failed",
        "Não foi possível carregar os exercícios do treino.",
      );
    }

    return data ?? [];
  }

  async countCompletedSessionsForStudent(studentUserId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("workout_sessions")
      .select("*", { count: "exact", head: true })
      .eq("student_user_id", studentUserId)
      .eq("status", "completed");

    if (error) {
      throw new ApiError(500, "workout_sessions_count_failed", "Não foi possível contar as sessões concluídas.");
    }

    return count ?? 0;
  }

  async countCompletedSessionsForStudentSince(studentUserId: string, sinceIso: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("workout_sessions")
      .select("*", { count: "exact", head: true })
      .eq("student_user_id", studentUserId)
      .eq("status", "completed")
      .gte("completed_at", sinceIso);

    if (error) {
      throw new ApiError(500, "workout_sessions_recent_count_failed", "Não foi possível contar as sessões recentes.");
    }

    return count ?? 0;
  }

  async findLastCompletedSessionForStudent(studentUserId: string): Promise<WorkoutSessionRecord | null> {
    const { data, error } = await this.supabase
      .from("workout_sessions")
      .select("*")
      .eq("student_user_id", studentUserId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new ApiError(
        500,
        "last_completed_session_fetch_failed",
        "Não foi possível carregar a última sessão concluída.",
      );
    }

    return data;
  }

  async createWorkoutSession(input: CreateWorkoutSessionRecordInput): Promise<WorkoutSessionRecord> {
    const payload: Database["public"]["Tables"]["workout_sessions"]["Insert"] = {
      student_user_id: input.studentUserId,
      trainer_user_id: input.trainerUserId,
      student_workout_id: input.studentWorkoutId,
      status: input.status,
      started_at: input.startedAt,
      completed_at: input.completedAt ?? null,
      duration_seconds: input.durationSeconds ?? null,
      notes: input.notes ?? null,
    };

    const { data, error } = await this.supabase
      .from("workout_sessions")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new ApiError(500, "workout_session_create_failed", "Não foi possível salvar a sessão de treino.");
    }

    return data;
  }

  async createWorkoutSessionSets(input: CreateWorkoutSessionSetRecordInput[]): Promise<void> {
    const payload: Database["public"]["Tables"]["workout_session_sets"]["Insert"][] = input.map(
      (item) => ({
        workout_session_id: item.workoutSessionId,
        student_workout_exercise_id: item.studentWorkoutExerciseId,
        exercise_name: item.exerciseName,
        set_number: item.setNumber,
        target_reps_text: item.targetRepsText ?? null,
        performed_reps: item.performedReps,
        load_kg: item.loadKg,
        notes: item.notes ?? null,
        completed: item.completed,
      }),
    );

    const { error } = await this.supabase.from("workout_session_sets").insert(payload);

    if (error) {
      throw new ApiError(500, "workout_session_sets_create_failed", "Não foi possível salvar os registros das séries.");
    }
  }

  async listCompletedSessionsForStudent(studentUserId: string): Promise<WorkoutSessionRecord[]> {
    const { data, error } = await this.supabase
      .from("workout_sessions")
      .select("*")
      .eq("student_user_id", studentUserId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false, nullsFirst: false });

    if (error) {
      throw new ApiError(500, "workout_sessions_list_failed", "Não foi possível carregar seu histórico de treinos.");
    }

    return data ?? [];
  }

  async listWorkoutSessionSetsBySessionIds(sessionIds: string[]): Promise<WorkoutSessionSetRecord[]> {
    if (sessionIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("workout_session_sets")
      .select("*")
      .in("workout_session_id", sessionIds)
      .order("set_number", { ascending: true });

    if (error) {
      throw new ApiError(500, "workout_session_sets_fetch_failed", "Não foi possível carregar as séries das sessões.");
    }

    return data ?? [];
  }

  async findStudentWorkoutsByIds(studentWorkoutIds: string[]): Promise<StudentWorkoutRecord[]> {
    if (studentWorkoutIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("student_workouts")
      .select("*")
      .in("id", studentWorkoutIds);

    if (error) {
      throw new ApiError(500, "student_workouts_fetch_failed", "Não foi possível carregar os treinos do histórico.");
    }

    return data ?? [];
  }

  async listActiveStudentsForTrainer(trainerUserId: string): Promise<TrainerActiveStudent[]> {
    const { data: relationships, error: relError } = await this.supabase
      .from("student_trainer_relationships")
      .select("*")
      .eq("trainer_user_id", trainerUserId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (relError) {
      throw new ApiError(500, "trainer_students_fetch_failed", "Não foi possível carregar os alunos vinculados.");
    }

    if (!relationships || relationships.length === 0) {
      return [];
    }

    const studentUserIds = relationships.map((relationship) => relationship.student_user_id);

    const { data: profiles, error: profilesError } = await this.supabase
      .from("profiles")
      .select("*")
      .in("id", studentUserIds);

    if (profilesError) {
      throw new ApiError(500, "student_profiles_fetch_failed", "Não foi possível carregar os perfis dos alunos.");
    }

    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

    return relationships.map((relationship) => {
      const profile = profileById.get(relationship.student_user_id);

      return {
        userId: relationship.student_user_id,
        fullName: profile?.full_name?.trim() || "Aluno sem nome",
        email: profile?.email?.trim() || "",
      };
    });
  }

  async listCompletedSessionsForTrainer(trainerUserId: string): Promise<WorkoutSessionRecord[]> {
    const { data, error } = await this.supabase
      .from("workout_sessions")
      .select("*")
      .eq("trainer_user_id", trainerUserId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false, nullsFirst: false });

    if (error) {
      throw new ApiError(500, "trainer_sessions_list_failed", "Não foi possível carregar a atividade dos alunos.");
    }

    return data ?? [];
  }

  async listCompletedSessionsForTrainerAndStudent(
    trainerUserId: string,
    studentUserId: string,
  ): Promise<WorkoutSessionRecord[]> {
    const { data, error } = await this.supabase
      .from("workout_sessions")
      .select("*")
      .eq("trainer_user_id", trainerUserId)
      .eq("student_user_id", studentUserId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false, nullsFirst: false });

    if (error) {
      throw new ApiError(500, "trainer_student_sessions_list_failed", "Não foi possível carregar as sessões do aluno.");
    }

    return data ?? [];
  }

  async deleteWorkoutSessionById(sessionId: string): Promise<void> {
    const { error } = await this.supabase
      .from("workout_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      throw new ApiError(500, "workout_session_cleanup_failed", "Não foi possível limpar a sessão após falha.");
    }
  }

  async findWorkoutSessionById(sessionId: string): Promise<WorkoutSessionRecord | null> {
    const { data, error } = await this.supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) {
      throw new ApiError(500, "workout_session_fetch_failed", "Não foi possível carregar a sessão de treino.");
    }

    return data;
  }

  async updateWorkoutSessionStatus(
    sessionId: string,
    status: string,
    completedAt: string,
    durationSeconds: number | null,
  ): Promise<WorkoutSessionRecord> {
    const { data, error } = await this.supabase
      .from("workout_sessions")
      .update({
        status,
        completed_at: completedAt,
        duration_seconds: durationSeconds,
      })
      .eq("id", sessionId)
      .select("*")
      .single();

    if (error) {
      throw new ApiError(500, "workout_session_update_failed", "Não foi possível atualizar a sessão de treino.");
    }

    return data;
  }

  async listWorkoutSessionSetsBySessionId(sessionId: string): Promise<WorkoutSessionSetRecord[]> {
    const { data, error } = await this.supabase
      .from("workout_session_sets")
      .select("*")
      .eq("workout_session_id", sessionId)
      .order("set_number", { ascending: true });

    if (error) {
      throw new ApiError(500, "workout_session_sets_fetch_failed", "Não foi possível carregar as séries da sessão.");
    }

    return data ?? [];
  }
}