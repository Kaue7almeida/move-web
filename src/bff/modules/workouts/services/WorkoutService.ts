import { ApiError } from "@/bff/core/errors/ApiError";
import type { NotificationService } from "@/bff/modules/notifications/services/NotificationService";
import type { CurrentUserIdentity } from "@/bff/modules/profile/types";
import type { IWorkoutRepository } from "@/bff/modules/workouts/types/IWorkoutRepository";
import type {
  AssignCustomizedWorkoutToStudentInput,
  AssignWorkoutToStudentInput,
  AssignWorkoutToStudentResponse,
  CompleteWorkoutSessionResponse,
  CreateStudentWorkoutExerciseRecordInput,
  CreateWorkoutSessionInput,
  CreateWorkoutSessionResponse,
  CreateWorkoutTemplateInput,
  ExerciseListResponse,
  ExerciseListItem,
  ExerciseMediaType,
  ExerciseRecord,
  StudentGalleryDetailResponse,
  StudentGalleryListResponse,
  StudentHomeSummary,
  StudentSessionDetail,
  StudentSessionDetailResponse,
  StudentSessionListResponse,
  StudentSessionSetDetail,
  StudentSessionSummary,
  StudentWorkoutDetail,
  StudentWorkoutDetailResponse,
  StudentWorkoutExerciseDetail,
  StudentWorkoutExerciseRecord,
  StudentWorkoutListResponse,
  StudentWorkoutRecord,
  StudentWorkoutSource,
  StudentWorkoutStatus,
  StudentWorkoutSummary,
  TrainerStudentsActivityResponse,
  TrainerWorkoutDetailResponse,
  TrainerWorkoutListResponse,
  UpdateWorkoutGalleryInput,
  WorkoutSessionDetail,
  WorkoutSessionRecord,
  WorkoutSessionSetRecord,
  WorkoutSessionSetSummary,
  WorkoutSessionStatus,
  WorkoutSessionSummary,
  WorkoutTemplateDetail,
  WorkoutTemplateExerciseDetail,
  WorkoutTemplateExerciseRecord,
  WorkoutTemplateRecord,
  WorkoutTemplateSummary,
  WorkoutTemplateStatus,
} from "@/bff/modules/workouts/types";

function assertUniqueSortOrder(sortOrders: number[]) {
  const seen = new Set<number>();

  for (const sortOrder of sortOrders) {
    if (seen.has(sortOrder)) {
      throw new ApiError(
        400,
        "duplicate_sort_order",
        "Cada exercício precisa ter uma posição única dentro do treino.",
      );
    }

    seen.add(sortOrder);
  }
}

function mapWorkoutTemplateSummary(
  workout: WorkoutTemplateRecord,
  exerciseCount: number,
): WorkoutTemplateSummary {
  return {
    id: workout.id,
    title: workout.title,
    description: workout.description,
    status: workout.status as WorkoutTemplateStatus,
    isInGallery: workout.is_in_gallery,
    galleryCategory: workout.gallery_category,
    createdAt: workout.created_at,
    updatedAt: workout.updated_at,
    exerciseCount,
  };
}

function mapWorkoutTemplateDetail(
  workout: WorkoutTemplateRecord,
  exerciseRows: WorkoutTemplateExerciseRecord[],
  exerciseMap: Map<string, ExerciseRecord>,
): WorkoutTemplateDetail {
  const exercises: WorkoutTemplateExerciseDetail[] = exerciseRows
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((exerciseRow) => {
      const exercise = exerciseMap.get(exerciseRow.exercise_id);

      if (!exercise) {
        throw new ApiError(
          500,
          "workout_exercise_library_mismatch",
          "Encontramos um exercício de treino sem referência válida na biblioteca.",
        );
      }

      return {
        id: exerciseRow.id,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        primaryMuscle: exercise.primary_muscle,
        equipment: exercise.equipment,
        sortOrder: exerciseRow.sort_order,
        setsCount: exerciseRow.sets_count,
        repsText: exerciseRow.reps_text,
        restSeconds: exerciseRow.rest_seconds,
        notes: exerciseRow.notes,
      };
    });

  return {
    id: workout.id,
    trainerUserId: workout.trainer_user_id,
    title: workout.title,
    description: workout.description,
    status: workout.status as WorkoutTemplateStatus,
    isInGallery: workout.is_in_gallery,
    galleryCategory: workout.gallery_category,
    createdAt: workout.created_at,
    updatedAt: workout.updated_at,
    exercises,
  };
}

function mapStudentWorkoutSummary(
  studentWorkoutId: string,
  trainerUserId: string,
  studentUserId: string,
  workoutTemplateId: string | null,
  title: string,
  description: string | null,
  status: Extract<StudentWorkoutStatus, "pending" | "active">,
  assignedAt: string,
  activatedAt: string | null,
  exerciseCount: number,
): StudentWorkoutSummary {
  return {
    id: studentWorkoutId,
    trainerUserId,
    studentUserId,
    workoutTemplateId,
    title,
    description,
    status,
    assignedAt,
    activatedAt,
    exerciseCount,
  };
}

function mapStudentWorkoutSummaryFromRecord(
  workout: StudentWorkoutRecord,
  exerciseCount: number,
): StudentWorkoutSummary {
  return {
    id: workout.id,
    trainerUserId: workout.trainer_user_id,
    studentUserId: workout.student_user_id,
    workoutTemplateId: workout.workout_template_id,
    title: workout.title,
    description: workout.description,
    status: workout.status as StudentWorkoutSummary["status"],
    assignedAt: workout.assigned_at,
    activatedAt: workout.activated_at,
    exerciseCount,
  };
}

function mapStudentWorkoutExerciseDetail(
  exerciseRow: StudentWorkoutExerciseRecord,
  exerciseMetadata?: {
    description: string | null;
    primaryMuscle: string | null;
    equipment: string | null;
    mediaType: ExerciseMediaType;
    thumbnailUrl: string | null;
    imageStartUrl: string | null;
    imageEndUrl: string | null;
  },
): StudentWorkoutExerciseDetail {
  return {
    id: exerciseRow.id,
    exerciseId: exerciseRow.exercise_id,
    exerciseName: exerciseRow.exercise_name,
    description: exerciseMetadata?.description ?? null,
    primaryMuscle: exerciseMetadata?.primaryMuscle ?? null,
    equipment: exerciseMetadata?.equipment ?? null,
    mediaType: exerciseMetadata?.mediaType ?? "none",
    thumbnailUrl: exerciseMetadata?.thumbnailUrl ?? null,
    imageStartUrl: exerciseMetadata?.imageStartUrl ?? null,
    imageEndUrl: exerciseMetadata?.imageEndUrl ?? null,
    sortOrder: exerciseRow.sort_order,
    setsCount: exerciseRow.sets_count,
    repsText: exerciseRow.reps_text,
    restSeconds: exerciseRow.rest_seconds,
    notes: exerciseRow.notes,
  };
}

function mapStudentWorkoutDetail(
  workout: StudentWorkoutRecord,
  exerciseRows: StudentWorkoutExerciseRecord[],
  exerciseMetadataMap: Map<string, {
    description: string | null;
    primaryMuscle: string | null;
    equipment: string | null;
    mediaType: ExerciseMediaType;
    thumbnailUrl: string | null;
    imageStartUrl: string | null;
    imageEndUrl: string | null;
  }>,
): StudentWorkoutDetail {
  const exercises = exerciseRows
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((exerciseRow) =>
      mapStudentWorkoutExerciseDetail(
        exerciseRow,
        exerciseRow.exercise_id ? exerciseMetadataMap.get(exerciseRow.exercise_id) : undefined,
      ),
    );

  return {
    id: workout.id,
    trainerUserId: workout.trainer_user_id,
    title: workout.title,
    description: workout.description,
    status: workout.status as StudentWorkoutDetail["status"],
    assignedAt: workout.assigned_at,
    activatedAt: workout.activated_at,
    exercises,
  };
}

type CreateStudentWorkoutSnapshotInput = {
  trainerUserId: string;
  studentUserId: string;
  workoutTemplateId: string;
  title: string;
  description?: string;
  status: Extract<StudentWorkoutStatus, "pending" | "active">;
  source: StudentWorkoutSource;
  exercises: CreateStudentWorkoutExerciseRecordInput[];
};

export class WorkoutService {
  constructor(
    private readonly workoutRepository: IWorkoutRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Notifies a student that a trainer assigned them a workout. Best-effort:
   * never throws — a notification failure must not break the assignment.
   */
  private async notifyWorkoutAssigned(input: {
    studentUserId: string;
    trainerUserId: string;
    studentWorkoutId: string;
    workoutTemplateId: string;
    workoutTitle: string;
  }): Promise<void> {
    try {
      await this.notificationService.notifyUser({
        recipientUserId: input.studentUserId,
        actorUserId: input.trainerUserId,
        type: "workout_assigned",
        title: "Novo treino disponível",
        body: `${input.workoutTitle} foi enviado pelo seu personal`,
        target: {
          path: "/app/treinos",
          type: "student_workout",
          entityId: input.studentWorkoutId,
        },
        metadata: {
          studentWorkoutId: input.studentWorkoutId,
          workoutTemplateId: input.workoutTemplateId,
          trainerUserId: input.trainerUserId,
        },
      });
    } catch {
      // Best-effort.
    }
  }

  private async requireTrainerAccess(identity: CurrentUserIdentity) {
    const trainerProfile = await this.workoutRepository.findTrainerProfileByUserId(identity.userId);

    if (!trainerProfile) {
      throw new ApiError(403, "trainer_access_required", "Apenas perfis de personal podem acessar esse recurso.");
    }

    if (!trainerProfile.activated_at) {
      throw new ApiError(
        409,
        "trainer_onboarding_incomplete",
        "Conclua seu onboarding de personal antes de trabalhar com treinos.",
      );
    }

    return trainerProfile;
  }

  private mapExerciseListItem(exercise: ExerciseRecord): ExerciseListItem {
    return {
      id: exercise.id,
      slug: exercise.slug,
      name: exercise.name,
      description: exercise.description,
      primary_muscle: exercise.primary_muscle,
      equipment: exercise.equipment,
      mediaType: exercise.media_type as ExerciseMediaType,
      thumbnailPath: exercise.thumbnail_path,
      imageStartPath: exercise.image_start_path,
      imageEndPath: exercise.image_end_path,
      thumbnailUrl: this.workoutRepository.getPublicMediaUrl(exercise.thumbnail_path),
      imageStartUrl: this.workoutRepository.getPublicMediaUrl(exercise.image_start_path),
      imageEndUrl: this.workoutRepository.getPublicMediaUrl(exercise.image_end_path),
    };
  }

  async listExercises(identity: CurrentUserIdentity): Promise<ExerciseListResponse> {
    await this.requireTrainerAccess(identity);
    const exercises = await this.workoutRepository.listExercises();

    return {
      items: exercises.map((exercise) => this.mapExerciseListItem(exercise)),
    };
  }

  async listTrainerWorkouts(identity: CurrentUserIdentity): Promise<TrainerWorkoutListResponse> {
    await this.requireTrainerAccess(identity);
    const workouts = await this.workoutRepository.listTrainerWorkoutTemplates(identity.userId);
    const workoutIds = workouts.map((workout) => workout.id);
    const workoutExercises = await this.workoutRepository.listWorkoutTemplateExercisesByWorkoutIds(workoutIds);

    const countByWorkoutId = new Map<string, number>();

    for (const workoutExercise of workoutExercises) {
      countByWorkoutId.set(
        workoutExercise.workout_template_id,
        (countByWorkoutId.get(workoutExercise.workout_template_id) ?? 0) + 1,
      );
    }

    return {
      items: workouts.map((workout) => mapWorkoutTemplateSummary(workout, countByWorkoutId.get(workout.id) ?? 0)),
    };
  }

  async getTrainerWorkout(
    identity: CurrentUserIdentity,
    workoutId: string,
  ): Promise<TrainerWorkoutDetailResponse> {
    await this.requireTrainerAccess(identity);

    const workout = await this.workoutRepository.findTrainerWorkoutTemplateById(workoutId, identity.userId);

    if (!workout) {
      throw new ApiError(404, "trainer_workout_not_found", "Treino não encontrado para esse personal.");
    }

    const exerciseRows = await this.workoutRepository.listWorkoutTemplateExercisesByWorkoutIds([workout.id]);
    const exerciseIds = Array.from(new Set(exerciseRows.map((exerciseRow) => exerciseRow.exercise_id)));
    const exerciseLibrary = await this.workoutRepository.findExercisesByIds(exerciseIds);
    const exerciseMap = new Map(exerciseLibrary.map((exercise) => [exercise.id, exercise]));

    return {
      workout: mapWorkoutTemplateDetail(workout, exerciseRows, exerciseMap),
    };
  }

  async createTrainerWorkout(
    identity: CurrentUserIdentity,
    input: CreateWorkoutTemplateInput,
  ): Promise<TrainerWorkoutDetailResponse> {
    await this.requireTrainerAccess(identity);
    assertUniqueSortOrder(input.exercises.map((exercise) => exercise.sortOrder));

    const exerciseIds = Array.from(new Set(input.exercises.map((exercise) => exercise.exerciseId)));
    const exerciseLibrary = await this.workoutRepository.findExercisesByIds(exerciseIds);

    if (exerciseLibrary.length !== exerciseIds.length) {
      throw new ApiError(
        400,
        "invalid_exercise_reference",
        "Um ou mais exercícios informados não existem na biblioteca ativa.",
      );
    }

    const createdWorkout = await this.workoutRepository.createWorkoutTemplate({
      trainerUserId: identity.userId,
      title: input.title,
      description: input.description,
      status: input.status ?? "draft",
    });

    try {
      await this.workoutRepository.createWorkoutTemplateExercises(
        input.exercises.map((exercise) => ({
          workoutTemplateId: createdWorkout.id,
          exerciseId: exercise.exerciseId,
          sortOrder: exercise.sortOrder,
          setsCount: exercise.setsCount,
          repsText: exercise.repsText,
          restSeconds: exercise.restSeconds,
          notes: exercise.notes,
        })),
      );
    } catch (error: unknown) {
      await this.workoutRepository.deleteWorkoutTemplateById(createdWorkout.id);
      throw error;
    }

    return this.getTrainerWorkout(identity, createdWorkout.id);
  }

  private async rollbackTrainerWorkoutUpdate(
    workoutId: string,
    trainerUserId: string,
    previousWorkout: WorkoutTemplateRecord,
    previousExercises: WorkoutTemplateExerciseRecord[],
    templateUpdated: boolean,
    exercisesDeleted: boolean,
  ) {
    try {
      if (templateUpdated) {
        await this.workoutRepository.updateWorkoutTemplateById(workoutId, trainerUserId, {
          title: previousWorkout.title,
          description: previousWorkout.description ?? undefined,
          status: previousWorkout.status as WorkoutTemplateStatus,
        });
      }

      if (exercisesDeleted) {
        await this.workoutRepository.deleteWorkoutTemplateExercisesByWorkoutId(workoutId);

        if (previousExercises.length > 0) {
          await this.workoutRepository.createWorkoutTemplateExercises(
            previousExercises.map((exercise) => ({
              workoutTemplateId: exercise.workout_template_id,
              exerciseId: exercise.exercise_id,
              sortOrder: exercise.sort_order,
              setsCount: exercise.sets_count,
              repsText: exercise.reps_text,
              restSeconds: exercise.rest_seconds ?? undefined,
              notes: exercise.notes ?? undefined,
            })),
          );
        }
      }
    } catch {
      throw new ApiError(
        500,
        "trainer_workout_update_rollback_failed",
        "Não foi possível restaurar o treino após falha na atualização.",
      );
    }
  }

  async updateTrainerWorkout(
    identity: CurrentUserIdentity,
    workoutId: string,
    input: CreateWorkoutTemplateInput,
  ): Promise<TrainerWorkoutDetailResponse> {
    await this.requireTrainerAccess(identity);

    const currentWorkout = await this.workoutRepository.findTrainerWorkoutTemplateById(workoutId, identity.userId);

    if (!currentWorkout) {
      throw new ApiError(404, "trainer_workout_not_found", "Treino não encontrado para esse personal.");
    }

    assertUniqueSortOrder(input.exercises.map((exercise) => exercise.sortOrder));

    const exerciseIds = Array.from(new Set(input.exercises.map((exercise) => exercise.exerciseId)));
    const exerciseLibrary = await this.workoutRepository.findExercisesByIds(exerciseIds);

    if (exerciseLibrary.length !== exerciseIds.length) {
      throw new ApiError(
        400,
        "invalid_exercise_reference",
        "Um ou mais exercícios informados não existem na biblioteca ativa.",
      );
    }

    const previousExercises = await this.workoutRepository.listWorkoutTemplateExercisesByWorkoutIds([workoutId]);
    const nextStatus = input.status ?? (currentWorkout.status as WorkoutTemplateStatus);

    let templateUpdated = false;
    let exercisesDeleted = false;

    try {
      await this.workoutRepository.updateWorkoutTemplateById(workoutId, identity.userId, {
        title: input.title,
        description: input.description,
        status: nextStatus,
      });
      templateUpdated = true;

      await this.workoutRepository.deleteWorkoutTemplateExercisesByWorkoutId(workoutId);
      exercisesDeleted = true;

      await this.workoutRepository.createWorkoutTemplateExercises(
        input.exercises.map((exercise) => ({
          workoutTemplateId: workoutId,
          exerciseId: exercise.exerciseId,
          sortOrder: exercise.sortOrder,
          setsCount: exercise.setsCount,
          repsText: exercise.repsText,
          restSeconds: exercise.restSeconds,
          notes: exercise.notes,
        })),
      );
    } catch (error: unknown) {
      if (templateUpdated || exercisesDeleted) {
        await this.rollbackTrainerWorkoutUpdate(
          workoutId,
          identity.userId,
          currentWorkout,
          previousExercises,
          templateUpdated,
          exercisesDeleted,
        );
      }

      throw error;
    }

    return this.getTrainerWorkout(identity, workoutId);
  }

  async setWorkoutGalleryVisibility(
    identity: CurrentUserIdentity,
    workoutId: string,
    input: UpdateWorkoutGalleryInput,
  ): Promise<TrainerWorkoutDetailResponse> {
    await this.requireTrainerAccess(identity);

    const currentWorkout = await this.workoutRepository.findTrainerWorkoutTemplateById(
      workoutId,
      identity.userId,
    );

    if (!currentWorkout) {
      throw new ApiError(404, "trainer_workout_not_found", "Treino não encontrado para esse personal.");
    }

    await this.workoutRepository.updateWorkoutTemplateGalleryById(workoutId, identity.userId, input);

    return this.getTrainerWorkout(identity, workoutId);
  }

  private async createStudentWorkoutSnapshot(
    input: CreateStudentWorkoutSnapshotInput,
  ): Promise<AssignWorkoutToStudentResponse> {
    const assignedAt = new Date().toISOString();
    const activatedAt = input.status === "active" ? assignedAt : null;

    const createdStudentWorkout = await this.workoutRepository.createStudentWorkout({
      trainerUserId: input.trainerUserId,
      studentUserId: input.studentUserId,
      workoutTemplateId: input.workoutTemplateId,
      title: input.title,
      description: input.description,
      status: input.status,
      source: input.source,
      assignedAt,
      activatedAt,
    });

    try {
      await this.workoutRepository.createStudentWorkoutExercises(
        input.exercises.map((exercise) => ({
          ...exercise,
          studentWorkoutId: createdStudentWorkout.id,
        })),
      );
    } catch (error: unknown) {
      await this.workoutRepository.deleteStudentWorkoutById(createdStudentWorkout.id);
      throw error;
    }

    return {
      studentWorkout: mapStudentWorkoutSummary(
        createdStudentWorkout.id,
        createdStudentWorkout.trainer_user_id,
        createdStudentWorkout.student_user_id,
        createdStudentWorkout.workout_template_id,
        createdStudentWorkout.title,
        createdStudentWorkout.description,
        input.status,
        createdStudentWorkout.assigned_at,
        createdStudentWorkout.activated_at,
        input.exercises.length,
      ),
    };
  }

  async assignWorkoutToStudent(
    identity: CurrentUserIdentity,
    workoutId: string,
    input: AssignWorkoutToStudentInput,
  ): Promise<AssignWorkoutToStudentResponse> {
    await this.requireTrainerAccess(identity);

    const workoutResponse = await this.getTrainerWorkout(identity, workoutId);
    const workout = workoutResponse.workout;

    if (workout.status !== "active") {
      throw new ApiError(
        409,
        "trainer_workout_not_active",
        "Ative o treino na galeria antes de aplicá-lo a um aluno.",
      );
    }

    const activeRelationship = await this.workoutRepository.findActiveRelationship(
      input.studentUserId,
      identity.userId,
    );

    if (!activeRelationship) {
      throw new ApiError(
        409,
        "student_relationship_required",
        "Esse aluno precisa estar vinculado ativamente ao personal antes da aplicação do treino.",
      );
    }

    const assignment = await this.createStudentWorkoutSnapshot({
      trainerUserId: identity.userId,
      studentUserId: input.studentUserId,
      workoutTemplateId: workout.id,
      title: workout.title,
      description: workout.description ?? undefined,
      status: input.status ?? "active",
      source: "assigned",
      exercises: workout.exercises.map((exercise) => ({
        studentWorkoutId: "",
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        sortOrder: exercise.sortOrder,
        setsCount: exercise.setsCount,
        repsText: exercise.repsText,
        restSeconds: exercise.restSeconds ?? undefined,
        notes: exercise.notes ?? undefined,
      })),
    });

    await this.notifyWorkoutAssigned({
      studentUserId: input.studentUserId,
      trainerUserId: identity.userId,
      studentWorkoutId: assignment.studentWorkout.id,
      workoutTemplateId: workout.id,
      workoutTitle: workout.title,
    });

    return assignment;
  }

  async assignCustomizedWorkoutToStudent(
    identity: CurrentUserIdentity,
    workoutId: string,
    input: AssignCustomizedWorkoutToStudentInput,
  ): Promise<AssignWorkoutToStudentResponse> {
    await this.requireTrainerAccess(identity);

    const workoutResponse = await this.getTrainerWorkout(identity, workoutId);
    const workout = workoutResponse.workout;

    if (workout.status !== "active") {
      throw new ApiError(
        409,
        "trainer_workout_not_active",
        "Ative o treino na galeria antes de aplicá-lo a um aluno.",
      );
    }

    const activeRelationship = await this.workoutRepository.findActiveRelationship(
      input.studentUserId,
      identity.userId,
    );

    if (!activeRelationship) {
      throw new ApiError(
        409,
        "student_relationship_required",
        "Esse aluno precisa estar vinculado ativamente ao personal antes da aplicação do treino.",
      );
    }

    assertUniqueSortOrder(input.exercises.map((exercise) => exercise.sortOrder));

    const exerciseIds = Array.from(new Set(input.exercises.map((exercise) => exercise.exerciseId)));
    const exerciseLibrary = await this.workoutRepository.findExercisesByIds(exerciseIds);

    if (exerciseLibrary.length !== exerciseIds.length) {
      throw new ApiError(
        400,
        "invalid_exercise_reference",
        "Um ou mais exercícios informados não existem na biblioteca ativa.",
      );
    }

    const exerciseMap = new Map(exerciseLibrary.map((exercise) => [exercise.id, exercise]));

    const assignment = await this.createStudentWorkoutSnapshot({
      trainerUserId: identity.userId,
      studentUserId: input.studentUserId,
      workoutTemplateId: workout.id,
      title: input.title,
      description: input.description,
      status: "active",
      source: "customized",
      exercises: input.exercises.map((exercise) => {
        const exerciseRecord = exerciseMap.get(exercise.exerciseId);

        if (!exerciseRecord) {
          throw new ApiError(
            400,
            "invalid_exercise_reference",
            "Um ou mais exercícios informados não existem na biblioteca ativa.",
          );
        }

        return {
          studentWorkoutId: "",
          exerciseId: exercise.exerciseId,
          exerciseName: exerciseRecord.name,
          sortOrder: exercise.sortOrder,
          setsCount: exercise.setsCount,
          repsText: exercise.repsText,
          restSeconds: exercise.restSeconds,
          notes: exercise.notes,
        };
      }),
    });

    await this.notifyWorkoutAssigned({
      studentUserId: input.studentUserId,
      trainerUserId: identity.userId,
      studentWorkoutId: assignment.studentWorkout.id,
      workoutTemplateId: workout.id,
      workoutTitle: input.title,
    });

    return assignment;
  }

  /* ─── Student-facing methods ─── */

  private async requireStudentAccess(identity: CurrentUserIdentity) {
    const studentProfile = await this.workoutRepository.findStudentProfileByUserId(identity.userId);

    if (!studentProfile) {
      throw new ApiError(403, "student_access_required", "Apenas perfis de aluno podem acessar esse recurso.");
    }

    return studentProfile;
  }

  async listStudentWorkouts(identity: CurrentUserIdentity): Promise<StudentWorkoutListResponse> {
    await this.requireStudentAccess(identity);
    const workouts = await this.workoutRepository.listStudentWorkouts(identity.userId);
    const workoutIds = workouts.map((w) => w.id);
    const workoutExercises = await this.workoutRepository.listStudentWorkoutExercisesByWorkoutIds(workoutIds);

    const countByWorkoutId = new Map<string, number>();

    for (const exercise of workoutExercises) {
      countByWorkoutId.set(
        exercise.student_workout_id,
        (countByWorkoutId.get(exercise.student_workout_id) ?? 0) + 1,
      );
    }

    return {
      items: workouts.map((w) => mapStudentWorkoutSummaryFromRecord(w, countByWorkoutId.get(w.id) ?? 0)),
    };
  }

  async getStudentHomeSummary(identity: CurrentUserIdentity): Promise<StudentHomeSummary> {
    await this.requireStudentAccess(identity);

    const { items: studentWorkouts } = await this.listStudentWorkouts(identity);
    const activeWorkouts = studentWorkouts.filter((workout) => workout.status === "active");
    const pendingWorkoutCount = studentWorkouts.filter((workout) => workout.status === "pending").length;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [completedSessionCount, sessionsLast7Days, lastSession] = await Promise.all([
      this.workoutRepository.countCompletedSessionsForStudent(identity.userId),
      this.workoutRepository.countCompletedSessionsForStudentSince(identity.userId, sevenDaysAgo),
      this.workoutRepository.findLastCompletedSessionForStudent(identity.userId),
    ]);

    let lastCompletedSession: StudentHomeSummary["lastCompletedSession"] = null;

    if (lastSession) {
      const sets = await this.workoutRepository.listWorkoutSessionSetsBySessionId(lastSession.id);
      const fromSummary = studentWorkouts.find((workout) => workout.id === lastSession.student_workout_id);
      let title = fromSummary?.title ?? null;

      if (title === null) {
        const workoutRecord = await this.workoutRepository.findStudentWorkoutById(
          lastSession.student_workout_id,
          identity.userId,
        );
        title = workoutRecord?.title ?? null;
      }

      lastCompletedSession = {
        id: lastSession.id,
        studentWorkoutId: lastSession.student_workout_id,
        title,
        completedAt: lastSession.completed_at,
        setsCount: sets.length,
      };
    }

    return {
      activeWorkoutCount: activeWorkouts.length,
      pendingWorkoutCount,
      completedSessionCount,
      sessionsLast7Days,
      lastCompletedSession,
      activeWorkouts,
    };
  }

  async getStudentWorkout(
    identity: CurrentUserIdentity,
    studentWorkoutId: string,
  ): Promise<StudentWorkoutDetailResponse> {
    await this.requireStudentAccess(identity);

    const workout = await this.workoutRepository.findStudentWorkoutById(studentWorkoutId, identity.userId);

    if (!workout) {
      throw new ApiError(404, "student_workout_not_found", "Treino não encontrado.");
    }

    const exerciseRows = await this.workoutRepository.listStudentWorkoutExercisesByWorkoutIds([workout.id]);
    const exerciseIds = Array.from(new Set(
      exerciseRows
        .map((exerciseRow) => exerciseRow.exercise_id)
        .filter((exerciseId): exerciseId is string => exerciseId !== null),
    ));
    const exerciseLibrary = exerciseIds.length > 0
      ? await this.workoutRepository.findExercisesByIds(exerciseIds)
      : [];
    const exerciseMetadataMap = new Map(
      exerciseLibrary.map((exercise) => [
        exercise.id,
        {
          description: exercise.description,
          primaryMuscle: exercise.primary_muscle,
          equipment: exercise.equipment,
          mediaType: exercise.media_type as ExerciseMediaType,
          thumbnailUrl: this.workoutRepository.getPublicMediaUrl(exercise.thumbnail_path),
          imageStartUrl: this.workoutRepository.getPublicMediaUrl(exercise.image_start_path),
          imageEndUrl: this.workoutRepository.getPublicMediaUrl(exercise.image_end_path),
        },
      ]),
    );

    return {
      workout: mapStudentWorkoutDetail(workout, exerciseRows, exerciseMetadataMap),
    };
  }

  /* ─── Student gallery (read-only) ─── */

  async listStudentGallery(identity: CurrentUserIdentity): Promise<StudentGalleryListResponse> {
    await this.requireStudentAccess(identity);

    const trainerIds = await this.workoutRepository.listActiveTrainerIdsForStudent(identity.userId);

    if (trainerIds.length === 0) {
      return { items: [] };
    }

    const templates = await this.workoutRepository.listGalleryTemplatesForTrainers(trainerIds);

    if (templates.length === 0) {
      return { items: [] };
    }

    const templateIds = templates.map((template) => template.id);
    const [templateExercises, trainerProfiles] = await Promise.all([
      this.workoutRepository.listWorkoutTemplateExercisesByWorkoutIds(templateIds),
      this.workoutRepository.findTrainerProfilesByIds(trainerIds),
    ]);

    const countByTemplate = new Map<string, number>();

    for (const exercise of templateExercises) {
      countByTemplate.set(
        exercise.workout_template_id,
        (countByTemplate.get(exercise.workout_template_id) ?? 0) + 1,
      );
    }

    const trainerNameById = new Map(
      trainerProfiles.map((profile) => [profile.user_id, profile.display_name?.trim() || "Personal"]),
    );

    return {
      items: templates.map((template) => ({
        templateId: template.id,
        trainerUserId: template.trainer_user_id,
        trainerName: trainerNameById.get(template.trainer_user_id) ?? "Personal",
        title: template.title,
        description: template.description,
        galleryCategory: template.gallery_category,
        exerciseCount: countByTemplate.get(template.id) ?? 0,
      })),
    };
  }

  async getStudentGalleryTemplate(
    identity: CurrentUserIdentity,
    templateId: string,
  ): Promise<StudentGalleryDetailResponse> {
    await this.requireStudentAccess(identity);

    const template = await this.workoutRepository.findWorkoutTemplateById(templateId);

    if (!template || !template.is_in_gallery || template.status !== "active") {
      throw new ApiError(404, "gallery_template_not_found", "Treino não encontrado na galeria.");
    }

    const relationship = await this.workoutRepository.findActiveRelationship(
      identity.userId,
      template.trainer_user_id,
    );

    if (!relationship) {
      throw new ApiError(404, "gallery_template_not_found", "Treino não encontrado na galeria.");
    }

    const [exerciseRows, trainerProfile] = await Promise.all([
      this.workoutRepository.listWorkoutTemplateExercisesByWorkoutIds([template.id]),
      this.workoutRepository.findTrainerProfileByUserId(template.trainer_user_id),
    ]);

    const exerciseIds = Array.from(new Set(exerciseRows.map((row) => row.exercise_id)));
    const exerciseLibrary = await this.workoutRepository.findExercisesByIds(exerciseIds);
    const libraryById = new Map(exerciseLibrary.map((exercise) => [exercise.id, exercise]));

    const exercises = exerciseRows
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((row) => {
        const exercise = libraryById.get(row.exercise_id);

        if (!exercise) {
          throw new ApiError(
            500,
            "workout_exercise_library_mismatch",
            "Encontramos um exercício do treino sem referência válida na biblioteca.",
          );
        }

        return {
          exerciseName: exercise.name,
          primaryMuscle: exercise.primary_muscle,
          equipment: exercise.equipment,
          mediaType: exercise.media_type as ExerciseMediaType,
          thumbnailUrl: this.workoutRepository.getPublicMediaUrl(exercise.thumbnail_path),
          imageStartUrl: this.workoutRepository.getPublicMediaUrl(exercise.image_start_path),
          imageEndUrl: this.workoutRepository.getPublicMediaUrl(exercise.image_end_path),
          sortOrder: row.sort_order,
          setsCount: row.sets_count,
          repsText: row.reps_text,
          restSeconds: row.rest_seconds,
          notes: row.notes,
        };
      });

    return {
      template: {
        templateId: template.id,
        trainerUserId: template.trainer_user_id,
        trainerName: trainerProfile?.display_name?.trim() || "Personal",
        title: template.title,
        description: template.description,
        galleryCategory: template.gallery_category,
        exercises,
      },
    };
  }

  async startStudentGalleryWorkout(
    identity: CurrentUserIdentity,
    templateId: string,
  ): Promise<AssignWorkoutToStudentResponse> {
    await this.requireStudentAccess(identity);

    const template = await this.workoutRepository.findWorkoutTemplateById(templateId);

    if (!template || !template.is_in_gallery || template.status !== "active") {
      throw new ApiError(404, "gallery_template_not_found", "Treino não encontrado na galeria.");
    }

    const relationship = await this.workoutRepository.findActiveRelationship(
      identity.userId,
      template.trainer_user_id,
    );

    if (!relationship) {
      throw new ApiError(404, "gallery_template_not_found", "Treino não encontrado na galeria.");
    }

    const exerciseRows = await this.workoutRepository.listWorkoutTemplateExercisesByWorkoutIds([
      template.id,
    ]);

    if (exerciseRows.length === 0) {
      throw new ApiError(
        409,
        "gallery_template_empty",
        "Este treino da galeria ainda não tem exercícios para iniciar.",
      );
    }

    const exerciseIds = Array.from(new Set(exerciseRows.map((row) => row.exercise_id)));
    const exerciseLibrary = await this.workoutRepository.findExercisesByIds(exerciseIds);
    const libraryById = new Map(exerciseLibrary.map((exercise) => [exercise.id, exercise]));

    return this.createStudentWorkoutSnapshot({
      trainerUserId: template.trainer_user_id,
      studentUserId: identity.userId,
      workoutTemplateId: template.id,
      title: template.title,
      description: template.description ?? undefined,
      status: "active",
      source: "gallery",
      exercises: exerciseRows
        .slice()
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((row) => {
          const exercise = libraryById.get(row.exercise_id);

          if (!exercise) {
            throw new ApiError(
              500,
              "workout_exercise_library_mismatch",
              "Encontramos um exercício do treino sem referência válida na biblioteca.",
            );
          }

          return {
            studentWorkoutId: "",
            exerciseId: row.exercise_id,
            exerciseName: exercise.name,
            sortOrder: row.sort_order,
            setsCount: row.sets_count,
            repsText: row.reps_text,
            restSeconds: row.rest_seconds ?? undefined,
            notes: row.notes ?? undefined,
          };
        }),
    });
  }

  /* ─── Student workout history ─── */

  private async buildSessionSummaries(
    sessions: WorkoutSessionRecord[],
  ): Promise<StudentSessionSummary[]> {
    if (sessions.length === 0) {
      return [];
    }

    const sessionIds = sessions.map((session) => session.id);
    const studentWorkoutIds = Array.from(new Set(sessions.map((session) => session.student_workout_id)));

    const [sets, workouts] = await Promise.all([
      this.workoutRepository.listWorkoutSessionSetsBySessionIds(sessionIds),
      this.workoutRepository.findStudentWorkoutsByIds(studentWorkoutIds),
    ]);

    const titleByWorkoutId = new Map(workouts.map((workout) => [workout.id, workout.title]));
    const sourceByWorkoutId = new Map(
      workouts.map((workout) => [workout.id, workout.source as StudentWorkoutSource]),
    );
    const setCountBySession = new Map<string, number>();
    const exerciseKeysBySession = new Map<string, Set<string>>();

    for (const set of sets) {
      setCountBySession.set(
        set.workout_session_id,
        (setCountBySession.get(set.workout_session_id) ?? 0) + 1,
      );

      const exerciseKey = set.student_workout_exercise_id ?? set.exercise_name;
      let keys = exerciseKeysBySession.get(set.workout_session_id);

      if (!keys) {
        keys = new Set<string>();
        exerciseKeysBySession.set(set.workout_session_id, keys);
      }

      keys.add(exerciseKey);
    }

    return sessions.map((session) => ({
      id: session.id,
      studentWorkoutId: session.student_workout_id,
      workoutTitle: titleByWorkoutId.get(session.student_workout_id) ?? null,
      source: sourceByWorkoutId.get(session.student_workout_id) ?? "assigned",
      status: session.status as WorkoutSessionStatus,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      durationSeconds: session.duration_seconds,
      setCount: setCountBySession.get(session.id) ?? 0,
      exerciseCount: exerciseKeysBySession.get(session.id)?.size ?? 0,
    }));
  }

  async listStudentWorkoutSessions(
    identity: CurrentUserIdentity,
  ): Promise<StudentSessionListResponse> {
    await this.requireStudentAccess(identity);

    const sessions = await this.workoutRepository.listCompletedSessionsForStudent(identity.userId);

    return { sessions: await this.buildSessionSummaries(sessions) };
  }

  private async buildSessionDetail(session: WorkoutSessionRecord): Promise<StudentSessionDetail> {
    const [sets, workout, workoutExercises] = await Promise.all([
      this.workoutRepository.listWorkoutSessionSetsBySessionId(session.id),
      this.workoutRepository.findStudentWorkoutById(session.student_workout_id, session.student_user_id),
      this.workoutRepository.listStudentWorkoutExercisesByWorkoutIds([session.student_workout_id]),
    ]);

    const sortOrderById = new Map(workoutExercises.map((exercise) => [exercise.id, exercise.sort_order]));

    type ExerciseGroup = {
      exerciseName: string;
      sortOrder: number;
      firstIndex: number;
      sets: StudentSessionSetDetail[];
    };

    const groups = new Map<string, ExerciseGroup>();

    sets.forEach((set, index) => {
      const exerciseKey = set.student_workout_exercise_id ?? set.exercise_name;
      let group = groups.get(exerciseKey);

      if (!group) {
        const resolvedSortOrder =
          set.student_workout_exercise_id !== null
            ? sortOrderById.get(set.student_workout_exercise_id)
            : undefined;

        group = {
          exerciseName: set.exercise_name,
          sortOrder: resolvedSortOrder ?? Number.MAX_SAFE_INTEGER,
          firstIndex: index,
          sets: [],
        };
        groups.set(exerciseKey, group);
      }

      group.sets.push({
        setNumber: set.set_number,
        targetRepsText: set.target_reps_text,
        performedReps: set.performed_reps,
        loadKg: set.load_kg,
        notes: set.notes,
        completed: set.completed,
      });
    });

    const exercises = Array.from(groups.values())
      .sort((left, right) => left.sortOrder - right.sortOrder || left.firstIndex - right.firstIndex)
      .map((group) => ({
        exerciseName: group.exerciseName,
        sets: group.sets.slice().sort((left, right) => left.setNumber - right.setNumber),
      }));

    return {
      id: session.id,
      studentWorkoutId: session.student_workout_id,
      workoutTitle: workout?.title ?? null,
      source: (workout?.source as StudentWorkoutSource | undefined) ?? "assigned",
      status: session.status as WorkoutSessionStatus,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      durationSeconds: session.duration_seconds,
      notes: session.notes,
      exercises,
    };
  }

  async getStudentWorkoutSession(
    identity: CurrentUserIdentity,
    sessionId: string,
  ): Promise<StudentSessionDetailResponse> {
    await this.requireStudentAccess(identity);

    const session = await this.workoutRepository.findWorkoutSessionById(sessionId);

    if (!session) {
      throw new ApiError(404, "session_not_found", "Sessão de treino não encontrada.");
    }

    if (session.student_user_id !== identity.userId) {
      throw new ApiError(403, "session_access_denied", "Você não tem acesso a essa sessão.");
    }

    return { session: await this.buildSessionDetail(session) };
  }

  /* ─── Trainer follow-up (student activity) ─── */

  private async requireActiveStudent(identity: CurrentUserIdentity, studentUserId: string) {
    const relationship = await this.workoutRepository.findActiveRelationship(studentUserId, identity.userId);

    if (!relationship) {
      throw new ApiError(
        403,
        "student_relationship_required",
        "Esse aluno não está vinculado ativamente a você.",
      );
    }
  }

  async getTrainerStudentsActivity(
    identity: CurrentUserIdentity,
  ): Promise<TrainerStudentsActivityResponse> {
    await this.requireTrainerAccess(identity);

    const [students, sessions] = await Promise.all([
      this.workoutRepository.listActiveStudentsForTrainer(identity.userId),
      this.workoutRepository.listCompletedSessionsForTrainer(identity.userId),
    ]);

    const summaries = await this.buildSessionSummaries(sessions);
    const summaryById = new Map(summaries.map((summary) => [summary.id, summary]));

    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

    type Aggregate = { count: number; last7Days: number; lastSessionId: string | null };
    const byStudent = new Map<string, Aggregate>();

    for (const session of sessions) {
      let aggregate = byStudent.get(session.student_user_id);

      if (!aggregate) {
        aggregate = { count: 0, last7Days: 0, lastSessionId: null };
        byStudent.set(session.student_user_id, aggregate);
      }

      aggregate.count += 1;

      if (session.completed_at && new Date(session.completed_at).getTime() >= cutoff) {
        aggregate.last7Days += 1;
      }

      // sessions arrive ordered by completed_at desc, so the first per student is the latest.
      if (aggregate.lastSessionId === null) {
        aggregate.lastSessionId = session.id;
      }
    }

    const activity = students.map((student) => {
      const aggregate = byStudent.get(student.userId) ?? null;
      const lastSummary = aggregate?.lastSessionId
        ? summaryById.get(aggregate.lastSessionId) ?? null
        : null;

      return {
        studentUserId: student.userId,
        fullName: student.fullName,
        email: student.email,
        status: "active",
        lastSession: lastSummary
          ? {
            id: lastSummary.id,
            workoutTitle: lastSummary.workoutTitle,
            completedAt: lastSummary.completedAt,
            setCount: lastSummary.setCount,
            exerciseCount: lastSummary.exerciseCount,
          }
          : null,
        completedSessionCount: aggregate?.count ?? 0,
        sessionsLast7Days: aggregate?.last7Days ?? 0,
      };
    });

    activity.sort((left, right) => {
      const leftTime = left.lastSession?.completedAt ? new Date(left.lastSession.completedAt).getTime() : 0;
      const rightTime = right.lastSession?.completedAt ? new Date(right.lastSession.completedAt).getTime() : 0;

      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }

      return left.fullName.localeCompare(right.fullName, "pt-BR");
    });

    return { students: activity };
  }

  async listTrainerStudentWorkoutSessions(
    identity: CurrentUserIdentity,
    studentUserId: string,
  ): Promise<StudentSessionListResponse> {
    await this.requireTrainerAccess(identity);
    await this.requireActiveStudent(identity, studentUserId);

    const sessions = await this.workoutRepository.listCompletedSessionsForTrainerAndStudent(
      identity.userId,
      studentUserId,
    );

    return { sessions: await this.buildSessionSummaries(sessions) };
  }

  async getTrainerStudentWorkoutSession(
    identity: CurrentUserIdentity,
    studentUserId: string,
    sessionId: string,
  ): Promise<StudentSessionDetailResponse> {
    await this.requireTrainerAccess(identity);
    await this.requireActiveStudent(identity, studentUserId);

    const session = await this.workoutRepository.findWorkoutSessionById(sessionId);

    if (!session) {
      throw new ApiError(404, "session_not_found", "Sessão de treino não encontrada.");
    }

    if (session.trainer_user_id !== identity.userId || session.student_user_id !== studentUserId) {
      throw new ApiError(403, "session_access_denied", "Você não tem acesso a essa sessão.");
    }

    return { session: await this.buildSessionDetail(session) };
  }

  /* ─── Workout session methods ─── */

  private mapSessionSetSummary(row: WorkoutSessionSetRecord): WorkoutSessionSetSummary {
    return {
      id: row.id,
      exerciseName: row.exercise_name,
      setNumber: row.set_number,
      targetRepsText: row.target_reps_text,
      performedReps: row.performed_reps,
      loadKg: row.load_kg,
      notes: row.notes,
      completed: row.completed,
    };
  }

  private mapSessionSummary(
    session: WorkoutSessionRecord,
    setsCount: number,
  ): WorkoutSessionSummary {
    return {
      id: session.id,
      studentWorkoutId: session.student_workout_id,
      status: session.status as WorkoutSessionSummary["status"],
      startedAt: session.started_at,
      completedAt: session.completed_at,
      durationSeconds: session.duration_seconds,
      notes: session.notes,
      setsCount,
    };
  }

  private mapSessionDetail(
    session: WorkoutSessionRecord,
    sets: WorkoutSessionSetRecord[],
  ): WorkoutSessionDetail {
    return {
      id: session.id,
      studentWorkoutId: session.student_workout_id,
      status: session.status as WorkoutSessionDetail["status"],
      startedAt: session.started_at,
      completedAt: session.completed_at,
      durationSeconds: session.duration_seconds,
      notes: session.notes,
      sets: sets.map((s) => this.mapSessionSetSummary(s)),
    };
  }

  async createWorkoutSession(
    identity: CurrentUserIdentity,
    studentWorkoutId: string,
    input: CreateWorkoutSessionInput,
  ): Promise<CreateWorkoutSessionResponse> {
    await this.requireStudentAccess(identity);

    const workout = await this.workoutRepository.findStudentWorkoutById(studentWorkoutId, identity.userId);

    if (!workout) {
      throw new ApiError(404, "student_workout_not_found", "Treino não encontrado.");
    }

    if (workout.status !== "active") {
      throw new ApiError(409, "student_workout_not_active", "Esse treino não está ativo para execução.");
    }

    if (input.sets.length === 0) {
      throw new ApiError(400, "empty_session", "Registre pelo menos uma série para salvar a sessão.");
    }

    // Validate exercise IDs belong to this workout
    const exerciseRows = await this.workoutRepository.listStudentWorkoutExercisesByWorkoutIds([workout.id]);
    const validExerciseIds = new Set(exerciseRows.map((e) => e.id));

    for (const set of input.sets) {
      if (!validExerciseIds.has(set.studentWorkoutExerciseId)) {
        throw new ApiError(
          400,
          "invalid_exercise_reference",
          "Um ou mais exercícios informados não pertencem a esse treino.",
        );
      }
    }

    const now = new Date().toISOString();

    const session = await this.workoutRepository.createWorkoutSession({
      studentUserId: identity.userId,
      trainerUserId: workout.trainer_user_id,
      studentWorkoutId: workout.id,
      status: "completed",
      startedAt: now,
      completedAt: now,
      durationSeconds: null,
      notes: input.notes,
    });

    try {
      await this.workoutRepository.createWorkoutSessionSets(
        input.sets.map((set) => ({
          workoutSessionId: session.id,
          studentWorkoutExerciseId: set.studentWorkoutExerciseId,
          exerciseName: set.exerciseName,
          setNumber: set.setNumber,
          targetRepsText: set.targetRepsText,
          performedReps: set.performedReps,
          loadKg: set.loadKg,
          notes: set.notes,
          completed: set.completed,
        })),
      );
    } catch (error: unknown) {
      await this.workoutRepository.deleteWorkoutSessionById(session.id);
      throw error;
    }

    const savedSets = await this.workoutRepository.listWorkoutSessionSetsBySessionId(session.id);

    return {
      session: this.mapSessionDetail(session, savedSets),
    };
  }

  async completeWorkoutSession(
    identity: CurrentUserIdentity,
    sessionId: string,
  ): Promise<CompleteWorkoutSessionResponse> {
    await this.requireStudentAccess(identity);

    const session = await this.workoutRepository.findWorkoutSessionById(sessionId);

    if (!session) {
      throw new ApiError(404, "session_not_found", "Sessão de treino não encontrada.");
    }

    if (session.student_user_id !== identity.userId) {
      throw new ApiError(403, "session_access_denied", "Você não tem acesso a essa sessão.");
    }

    if (session.status === "completed") {
      // Already completed — return idempotent response
      const sets = await this.workoutRepository.listWorkoutSessionSetsBySessionId(session.id);

      return {
        session: this.mapSessionSummary(session, sets.length),
      };
    }

    const now = new Date().toISOString();
    const startTime = new Date(session.started_at).getTime();
    const endTime = new Date(now).getTime();
    const durationSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));

    const updatedSession = await this.workoutRepository.updateWorkoutSessionStatus(
      session.id,
      "completed",
      now,
      durationSeconds,
    );

    const sets = await this.workoutRepository.listWorkoutSessionSetsBySessionId(session.id);

    return {
      session: this.mapSessionSummary(updatedSession, sets.length),
    };
  }
}