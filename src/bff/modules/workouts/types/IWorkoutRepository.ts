import type { StudentTrainerRelationshipRecord, TrainerProfileRecord } from "@/bff/modules/profile/types";
import type { StudentProfileRecord } from "@/bff/modules/profile/types";
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

export interface IWorkoutRepository {
  listExercises(): Promise<ExerciseRecord[]>;
  findExercisesByIds(exerciseIds: string[]): Promise<ExerciseRecord[]>;
  /**
   * Resolves a Storage object path (within the public "exercises" bucket) into a
   * public URL. Pure string concatenation — no network call, no service-role leak.
   * Returns null when the path is null/empty.
   */
  getPublicMediaUrl(path: string | null): string | null;
  findTrainerProfileByUserId(userId: string): Promise<TrainerProfileRecord | null>;
  listTrainerWorkoutTemplates(trainerUserId: string): Promise<WorkoutTemplateRecord[]>;
  createWorkoutTemplate(input: CreateWorkoutTemplateRecordInput): Promise<WorkoutTemplateRecord>;
  updateWorkoutTemplateById(
    workoutId: string,
    trainerUserId: string,
    input: UpdateWorkoutTemplateRecordInput,
  ): Promise<WorkoutTemplateRecord>;
  updateWorkoutTemplateGalleryById(
    workoutId: string,
    trainerUserId: string,
    input: UpdateWorkoutGalleryInput,
  ): Promise<WorkoutTemplateRecord>;
  createWorkoutTemplateExercises(input: CreateWorkoutTemplateExerciseRecordInput[]): Promise<void>;
  deleteWorkoutTemplateExercisesByWorkoutId(workoutId: string): Promise<void>;
  deleteWorkoutTemplateById(workoutId: string): Promise<void>;
  findTrainerWorkoutTemplateById(
    workoutId: string,
    trainerUserId: string,
  ): Promise<WorkoutTemplateRecord | null>;
  listWorkoutTemplateExercisesByWorkoutIds(
    workoutIds: string[],
  ): Promise<WorkoutTemplateExerciseRecord[]>;
  findActiveRelationship(
    studentUserId: string,
    trainerUserId: string,
  ): Promise<StudentTrainerRelationshipRecord | null>;
  createStudentWorkout(input: CreateStudentWorkoutRecordInput): Promise<StudentWorkoutRecord>;
  createStudentWorkoutExercises(input: CreateStudentWorkoutExerciseRecordInput[]): Promise<void>;
  deleteStudentWorkoutById(studentWorkoutId: string): Promise<void>;
  findStudentProfileByUserId(userId: string): Promise<StudentProfileRecord | null>;
  listStudentWorkouts(studentUserId: string): Promise<StudentWorkoutRecord[]>;
  listActiveTrainerIdsForStudent(studentUserId: string): Promise<string[]>;
  listGalleryTemplatesForTrainers(trainerUserIds: string[]): Promise<WorkoutTemplateRecord[]>;
  findTrainerProfilesByIds(trainerUserIds: string[]): Promise<TrainerProfileRecord[]>;
  findWorkoutTemplateById(templateId: string): Promise<WorkoutTemplateRecord | null>;
  findStudentWorkoutById(
    studentWorkoutId: string,
    studentUserId: string,
  ): Promise<StudentWorkoutRecord | null>;
  listStudentWorkoutExercisesByWorkoutIds(
    studentWorkoutIds: string[],
  ): Promise<StudentWorkoutExerciseRecord[]>;
  countCompletedSessionsForStudent(studentUserId: string): Promise<number>;
  countCompletedSessionsForStudentSince(studentUserId: string, sinceIso: string): Promise<number>;
  findLastCompletedSessionForStudent(studentUserId: string): Promise<WorkoutSessionRecord | null>;
  listCompletedSessionsForStudent(studentUserId: string): Promise<WorkoutSessionRecord[]>;
  listWorkoutSessionSetsBySessionIds(sessionIds: string[]): Promise<WorkoutSessionSetRecord[]>;
  findStudentWorkoutsByIds(studentWorkoutIds: string[]): Promise<StudentWorkoutRecord[]>;
  listActiveStudentsForTrainer(trainerUserId: string): Promise<TrainerActiveStudent[]>;
  listStudentWorkoutsForTrainerAndStudent(
    trainerUserId: string,
    studentUserId: string,
  ): Promise<StudentWorkoutRecord[]>;
  listCompletedSessionsForTrainer(trainerUserId: string): Promise<WorkoutSessionRecord[]>;
  listCompletedSessionsForTrainerAndStudent(
    trainerUserId: string,
    studentUserId: string,
  ): Promise<WorkoutSessionRecord[]>;
  createWorkoutSession(input: CreateWorkoutSessionRecordInput): Promise<WorkoutSessionRecord>;
  createWorkoutSessionSets(input: CreateWorkoutSessionSetRecordInput[]): Promise<void>;
  deleteWorkoutSessionById(sessionId: string): Promise<void>;
  findWorkoutSessionById(sessionId: string): Promise<WorkoutSessionRecord | null>;
  updateWorkoutSessionStatus(
    sessionId: string,
    status: string,
    completedAt: string,
    durationSeconds: number | null,
  ): Promise<WorkoutSessionRecord>;
  listWorkoutSessionSetsBySessionId(sessionId: string): Promise<WorkoutSessionSetRecord[]>;
}