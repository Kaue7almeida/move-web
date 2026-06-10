import type { Database } from "@/bff/core/supabase/database.types";
import type {
  StudentTrainerRelationshipRecord,
  TrainerProfileRecord,
} from "@/bff/modules/profile/types";

export type ExerciseRecord = Database["public"]["Tables"]["exercises"]["Row"];
export type WorkoutTemplateRecord = Database["public"]["Tables"]["workout_templates"]["Row"];
export type WorkoutTemplateExerciseRecord =
  Database["public"]["Tables"]["workout_template_exercises"]["Row"];
export type StudentWorkoutRecord = Database["public"]["Tables"]["student_workouts"]["Row"];
export type StudentWorkoutExerciseRecord =
  Database["public"]["Tables"]["student_workout_exercises"]["Row"];

export type WorkoutTemplateStatus = "draft" | "active" | "archived";
export type StudentWorkoutStatus = "pending" | "active" | "cancelled";

export type WorkoutTemplateExerciseInput = {
  exerciseId: string;
  sortOrder: number;
  setsCount: number;
  repsText: string;
  restSeconds?: number;
  notes?: string;
};

export type CreateWorkoutTemplateInput = {
  title: string;
  description?: string;
  status?: WorkoutTemplateStatus;
  exercises: WorkoutTemplateExerciseInput[];
};

export type AssignWorkoutToStudentInput = {
  studentUserId: string;
  status?: Extract<StudentWorkoutStatus, "pending" | "active">;
};

export type AssignCustomizedWorkoutToStudentInput = {
  studentUserId: string;
  title: string;
  description?: string;
  exercises: WorkoutTemplateExerciseInput[];
};

export type CreateWorkoutTemplateRecordInput = {
  trainerUserId: string;
  title: string;
  description?: string;
  status: WorkoutTemplateStatus;
};

export type UpdateWorkoutTemplateRecordInput = {
  title: string;
  description?: string;
  status: WorkoutTemplateStatus;
};

export type UpdateWorkoutGalleryInput = {
  isInGallery: boolean;
  galleryCategory?: string | null;
};

export type CreateWorkoutTemplateExerciseRecordInput = {
  workoutTemplateId: string;
  exerciseId: string;
  sortOrder: number;
  setsCount: number;
  repsText: string;
  restSeconds?: number;
  notes?: string;
};

export type StudentWorkoutSource = "assigned" | "customized" | "gallery";

export type CreateStudentWorkoutRecordInput = {
  trainerUserId: string;
  studentUserId: string;
  workoutTemplateId?: string | null;
  title: string;
  description?: string;
  status: Extract<StudentWorkoutStatus, "pending" | "active">;
  source: StudentWorkoutSource;
  assignedAt: string;
  activatedAt?: string | null;
};

export type CreateStudentWorkoutExerciseRecordInput = {
  studentWorkoutId: string;
  exerciseId?: string | null;
  exerciseName: string;
  sortOrder: number;
  setsCount: number;
  repsText: string;
  restSeconds?: number;
  notes?: string;
};

export type ExerciseMediaType = "none" | "image_pair" | "gif" | "video";

export type ExerciseListItem = {
  id: ExerciseRecord["id"];
  slug: ExerciseRecord["slug"];
  name: ExerciseRecord["name"];
  description: ExerciseRecord["description"];
  primary_muscle: ExerciseRecord["primary_muscle"];
  equipment: ExerciseRecord["equipment"];
  mediaType: ExerciseMediaType;
  thumbnailPath: string | null;
  imageStartPath: string | null;
  imageEndPath: string | null;
  thumbnailUrl: string | null;
  imageStartUrl: string | null;
  imageEndUrl: string | null;
};

export type WorkoutTemplateSummary = {
  id: string;
  title: string;
  description: string | null;
  status: WorkoutTemplateStatus;
  isInGallery: boolean;
  galleryCategory: string | null;
  createdAt: string;
  updatedAt: string;
  exerciseCount: number;
};

export type WorkoutTemplateExerciseDetail = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string | null;
  equipment: string | null;
  sortOrder: number;
  setsCount: number;
  repsText: string;
  restSeconds: number | null;
  notes: string | null;
};

export type WorkoutTemplateDetail = {
  id: string;
  trainerUserId: string;
  title: string;
  description: string | null;
  status: WorkoutTemplateStatus;
  isInGallery: boolean;
  galleryCategory: string | null;
  createdAt: string;
  updatedAt: string;
  exercises: WorkoutTemplateExerciseDetail[];
};

export type StudentWorkoutSummary = {
  id: string;
  trainerUserId: string;
  studentUserId: string;
  workoutTemplateId: string | null;
  title: string;
  description: string | null;
  status: StudentWorkoutStatus;
  assignedAt: string;
  activatedAt: string | null;
  exerciseCount: number;
};

export type ExerciseListResponse = {
  items: ExerciseListItem[];
};

export type TrainerWorkoutListResponse = {
  items: WorkoutTemplateSummary[];
};

export type TrainerWorkoutDetailResponse = {
  workout: WorkoutTemplateDetail;
};

export type AssignWorkoutToStudentResponse = {
  studentWorkout: StudentWorkoutSummary;
};

export type WorkoutServiceTrainerContext = {
  trainerProfile: TrainerProfileRecord;
};

export type ActiveStudentRelationship = StudentTrainerRelationshipRecord;

export type WorkoutSessionRecord = Database["public"]["Tables"]["workout_sessions"]["Row"];
export type WorkoutSessionSetRecord = Database["public"]["Tables"]["workout_session_sets"]["Row"];

/* ─── Student-facing types ─── */

export type StudentWorkoutExerciseDetail = {
  id: string;
  exerciseId: string | null;
  exerciseName: string;
  description: string | null;
  primaryMuscle: string | null;
  equipment: string | null;
  mediaType: ExerciseMediaType;
  thumbnailUrl: string | null;
  imageStartUrl: string | null;
  imageEndUrl: string | null;
  sortOrder: number;
  setsCount: number;
  repsText: string;
  restSeconds: number | null;
  notes: string | null;
};

export type StudentWorkoutDetail = {
  id: string;
  trainerUserId: string;
  title: string;
  description: string | null;
  status: StudentWorkoutStatus;
  assignedAt: string;
  activatedAt: string | null;
  exercises: StudentWorkoutExerciseDetail[];
};

export type StudentWorkoutListResponse = {
  items: StudentWorkoutSummary[];
};

export type StudentWorkoutDetailResponse = {
  workout: StudentWorkoutDetail;
};

/* ─── Student gallery (read-only) types ─── */

export type StudentGalleryItem = {
  templateId: string;
  trainerUserId: string;
  trainerName: string;
  title: string;
  description: string | null;
  galleryCategory: string | null;
  exerciseCount: number;
};

export type StudentGalleryExercise = {
  exerciseName: string;
  primaryMuscle: string | null;
  equipment: string | null;
  mediaType: ExerciseMediaType;
  thumbnailUrl: string | null;
  imageStartUrl: string | null;
  imageEndUrl: string | null;
  sortOrder: number;
  setsCount: number;
  repsText: string;
  restSeconds: number | null;
  notes: string | null;
};

export type StudentGalleryDetail = {
  templateId: string;
  trainerUserId: string;
  trainerName: string;
  title: string;
  description: string | null;
  galleryCategory: string | null;
  exercises: StudentGalleryExercise[];
};

export type StudentGalleryListResponse = {
  items: StudentGalleryItem[];
};

export type StudentGalleryDetailResponse = {
  template: StudentGalleryDetail;
};

export type StudentHomeSummaryLastSession = {
  id: string;
  studentWorkoutId: string;
  title: string | null;
  completedAt: string | null;
  setsCount: number;
};

export type StudentHomeSummary = {
  activeWorkoutCount: number;
  pendingWorkoutCount: number;
  completedSessionCount: number;
  sessionsLast7Days: number;
  lastCompletedSession: StudentHomeSummaryLastSession | null;
  activeWorkouts: StudentWorkoutSummary[];
};

/* ─── Student workout history types ─── */

export type StudentSessionSummary = {
  id: string;
  studentWorkoutId: string;
  workoutTitle: string | null;
  source: StudentWorkoutSource;
  status: WorkoutSessionStatus;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  setCount: number;
  exerciseCount: number;
};

export type StudentSessionSetDetail = {
  setNumber: number;
  targetRepsText: string | null;
  performedReps: number;
  loadKg: number;
  notes: string | null;
  completed: boolean;
};

export type StudentSessionExerciseDetail = {
  exerciseName: string;
  sets: StudentSessionSetDetail[];
};

export type StudentSessionDetail = {
  id: string;
  studentWorkoutId: string;
  workoutTitle: string | null;
  source: StudentWorkoutSource;
  status: WorkoutSessionStatus;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  exercises: StudentSessionExerciseDetail[];
};

export type StudentSessionListResponse = {
  sessions: StudentSessionSummary[];
};

export type StudentSessionDetailResponse = {
  session: StudentSessionDetail;
};

/* ─── Trainer follow-up (student activity) types ─── */

export type TrainerActiveStudent = {
  userId: string;
  fullName: string;
  email: string;
};

export type TrainerActivityLastSession = {
  id: string;
  workoutTitle: string | null;
  completedAt: string | null;
  setCount: number;
  exerciseCount: number;
};

export type TrainerStudentActivity = {
  studentUserId: string;
  fullName: string;
  email: string;
  status: string;
  lastSession: TrainerActivityLastSession | null;
  completedSessionCount: number;
  sessionsLast7Days: number;
};

export type TrainerStudentsActivityResponse = {
  students: TrainerStudentActivity[];
};

/* ─── Workout session types ─── */

export type WorkoutSessionStatus = "in_progress" | "completed";

export type CreateWorkoutSessionSetInput = {
  studentWorkoutExerciseId: string;
  exerciseName: string;
  setNumber: number;
  targetRepsText?: string;
  performedReps: number;
  loadKg: number;
  notes?: string;
  completed: boolean;
};

export type CreateWorkoutSessionInput = {
  sets: CreateWorkoutSessionSetInput[];
  notes?: string;
};

export type CreateWorkoutSessionRecordInput = {
  studentUserId: string;
  trainerUserId: string;
  studentWorkoutId: string;
  status: WorkoutSessionStatus;
  startedAt: string;
  completedAt?: string | null;
  durationSeconds?: number | null;
  notes?: string;
};

export type CreateWorkoutSessionSetRecordInput = {
  workoutSessionId: string;
  studentWorkoutExerciseId: string;
  exerciseName: string;
  setNumber: number;
  targetRepsText?: string;
  performedReps: number;
  loadKg: number;
  notes?: string;
  completed: boolean;
};

export type WorkoutSessionSetSummary = {
  id: string;
  exerciseName: string;
  setNumber: number;
  targetRepsText: string | null;
  performedReps: number;
  loadKg: number;
  notes: string | null;
  completed: boolean;
};

export type WorkoutSessionSummary = {
  id: string;
  studentWorkoutId: string;
  status: WorkoutSessionStatus;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  setsCount: number;
};

export type WorkoutSessionDetail = {
  id: string;
  studentWorkoutId: string;
  status: WorkoutSessionStatus;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  sets: WorkoutSessionSetSummary[];
};

export type CreateWorkoutSessionResponse = {
  session: WorkoutSessionDetail;
};

export type CompleteWorkoutSessionResponse = {
  session: WorkoutSessionSummary;
};