import type {
  CreateWorkoutTemplateInput,
  ExerciseListItem,
  ExerciseMediaType,
  WorkoutTemplateExerciseDetail,
  WorkoutTemplateStatus,
} from "@/bff/modules/workouts/types";

/** Backend caps a workout template at 20 exercises (see POST schema). */
export const MAX_WORKOUT_EXERCISES = 20;

export type StudioExerciseField = "setsCount" | "repsText" | "restSeconds" | "notes";

/** A single exercise placed on the studio canvas. Numeric fields stay as strings
 *  while editing (controlled inputs); they are parsed when building the payload.
 *  description/imageEndUrl are display-only and never sent to the backend. */
export type StudioExerciseItem = {
  key: string;
  exerciseId: string;
  name: string;
  description: string | null;
  primaryMuscle: string | null;
  equipment: string | null;
  mediaType: ExerciseMediaType;
  thumbnailUrl: string | null;
  imageStartUrl: string | null;
  imageEndUrl: string | null;
  setsCount: string;
  repsText: string;
  restSeconds: string;
  notes: string;
};

/** Minimal shape required to render ExercisePreviewModal.
 *  Constructable from either ExerciseListItem or StudioExerciseItem. */
export type PreviewExercise = {
  name: string;
  primaryMuscle: string | null;
  equipment: string | null;
  description: string | null;
  mediaType: ExerciseMediaType;
  imageStartUrl: string | null;
  imageEndUrl: string | null;
};

let keyCounter = 0;

export function createStudioKey(): string {
  keyCounter += 1;
  return `studio-${keyCounter}`;
}

export function createStudioItem(exercise: ExerciseListItem): StudioExerciseItem {
  return {
    key: createStudioKey(),
    exerciseId: exercise.id,
    name: exercise.name,
    description: exercise.description,
    primaryMuscle: exercise.primary_muscle,
    equipment: exercise.equipment,
    mediaType: exercise.mediaType,
    thumbnailUrl: exercise.thumbnailUrl,
    imageStartUrl: exercise.imageStartUrl,
    imageEndUrl: exercise.imageEndUrl,
    setsCount: "3",
    repsText: "12",
    restSeconds: "60",
    notes: "",
  };
}

export function createStudioItemFromTemplate(
  exercise: WorkoutTemplateExerciseDetail,
  libraryExercise?: ExerciseListItem,
): StudioExerciseItem {
  return {
    key: createStudioKey(),
    exerciseId: exercise.exerciseId,
    name: libraryExercise?.name ?? exercise.exerciseName,
    description: libraryExercise?.description ?? null,
    primaryMuscle: libraryExercise?.primary_muscle ?? exercise.primaryMuscle,
    equipment: libraryExercise?.equipment ?? exercise.equipment,
    mediaType: libraryExercise?.mediaType ?? "none",
    thumbnailUrl: libraryExercise?.thumbnailUrl ?? null,
    imageStartUrl: libraryExercise?.imageStartUrl ?? null,
    imageEndUrl: libraryExercise?.imageEndUrl ?? null,
    setsCount: String(exercise.setsCount),
    repsText: exercise.repsText,
    restSeconds: exercise.restSeconds != null ? String(exercise.restSeconds) : "",
    notes: exercise.notes ?? "",
  };
}

export function hydrateStudioItemFromLibrary(
  item: StudioExerciseItem,
  exercise: ExerciseListItem,
): StudioExerciseItem {
  return {
    ...item,
    name: exercise.name,
    description: exercise.description,
    primaryMuscle: exercise.primary_muscle,
    equipment: exercise.equipment,
    mediaType: exercise.mediaType,
    thumbnailUrl: exercise.thumbnailUrl,
    imageStartUrl: exercise.imageStartUrl,
    imageEndUrl: exercise.imageEndUrl,
  };
}

const MUSCLE_LABELS: Record<string, string> = {
  peitoral: "Peitoral",
  costas: "Costas",
  ombros: "Ombros",
  triceps: "Tríceps",
  biceps: "Bíceps",
  quadriceps: "Quadríceps",
  posteriores: "Posteriores",
  gluteos: "Glúteos",
  panturrilha: "Panturrilha",
  adutores: "Adutores",
  abdutores: "Abdutores",
  core: "Core",
};

const EQUIPMENT_LABELS: Record<string, string> = {
  barra: "Barra",
  halteres: "Halteres",
  maquina: "Máquina",
  polia: "Polia",
  smith: "Smith",
  "peso corporal": "Peso corporal",
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatMuscle(value: string | null): string {
  if (!value) {
    return "Geral";
  }

  return MUSCLE_LABELS[value] ?? capitalize(value);
}

export function formatEquipment(value: string | null): string {
  if (!value) {
    return "Livre";
  }

  return EQUIPMENT_LABELS[value] ?? capitalize(value);
}

/** Cover image for a card: thumbnail when available, else the start frame. */
export function coverUrlFor(item: {
  thumbnailUrl: string | null;
  imageStartUrl: string | null;
}): string | null {
  return item.thumbnailUrl ?? item.imageStartUrl;
}

export type WorkoutSummaryData = {
  exerciseCount: number;
  totalSets: number;
  muscles: string[];
};

export function summarizeWorkout(items: StudioExerciseItem[]): WorkoutSummaryData {
  let totalSets = 0;
  const seen = new Set<string>();
  const muscles: string[] = [];

  for (const item of items) {
    const sets = Number.parseInt(item.setsCount, 10);

    if (Number.isFinite(sets) && sets > 0) {
      totalSets += sets;
    }

    const label = formatMuscle(item.primaryMuscle);

    if (!seen.has(label)) {
      seen.add(label);
      muscles.push(label);
    }
  }

  return { exerciseCount: items.length, totalSets, muscles };
}

/** Builds the body accepted by POST /api/v1/trainer/workouts and PUT /api/v1/trainer/workouts/[workoutId].
 *  Assumes sets/reps were already validated by the caller. */
export function buildWorkoutPayload(
  title: string,
  description: string,
  items: StudioExerciseItem[],
  options?: {
    status?: WorkoutTemplateStatus;
  },
): CreateWorkoutTemplateInput {
  const trimmedDescription = description.trim();

  return {
    title: title.trim(),
    ...(trimmedDescription ? { description: trimmedDescription } : {}),
    ...(options?.status ? { status: options.status } : {}),
    exercises: items.map((item, index) => {
      const restSeconds = Number.parseInt(item.restSeconds, 10);
      const hasRest = item.restSeconds.trim() !== "" && Number.isFinite(restSeconds) && restSeconds >= 0;
      const notes = item.notes.trim();

      return {
        exerciseId: item.exerciseId,
        sortOrder: index + 1,
        setsCount: Number.parseInt(item.setsCount, 10),
        repsText: item.repsText.trim(),
        ...(hasRest ? { restSeconds } : {}),
        ...(notes ? { notes } : {}),
      };
    }),
  };
}
