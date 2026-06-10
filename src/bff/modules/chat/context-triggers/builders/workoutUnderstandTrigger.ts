import { ApiError } from "@/bff/core/errors/ApiError";
import type { WorkoutService } from "@/bff/modules/workouts/services/WorkoutService";
import type {
  StudentWorkoutDetail,
  StudentWorkoutExerciseDetail,
} from "@/bff/modules/workouts/types";

import type {
  ChatContextTriggerBuilder,
  ChatContextTriggerInput,
  ChatContextTriggerResult,
} from "../types";

const CHAT_CONTEXT_NOT_FOUND = new ApiError(
  404,
  "chat_context_not_found",
  "Não foi possível encontrar o contexto solicitado.",
);

function formatExerciseLine(exercise: StudentWorkoutExerciseDetail, index: number): string {
  const details: string[] = [`${exercise.setsCount} série(s)`];

  if (exercise.repsText) {
    details.push(`${exercise.repsText} repetições`);
  }
  if (exercise.restSeconds !== null) {
    details.push(`descanso ${exercise.restSeconds}s`);
  }
  if (exercise.primaryMuscle) {
    details.push(`músculo: ${exercise.primaryMuscle}`);
  }
  if (exercise.equipment) {
    details.push(`equipamento: ${exercise.equipment}`);
  }

  let line = `${index + 1}. ${exercise.exerciseName} — ${details.join(", ")}`;

  if (exercise.notes) {
    line += ` (observações: ${exercise.notes})`;
  }

  return line;
}

/** Data-only context block (no task framing) reused on first turn + follow-ups. */
function buildWorkoutContextBlock(workout: StudentWorkoutDetail): string {
  const orderedExercises = [...workout.exercises].sort((a, b) => a.sortOrder - b.sortOrder);
  const exerciseLines =
    orderedExercises.length > 0
      ? orderedExercises.map((exercise, index) => `  ${formatExerciseLine(exercise, index)}`)
      : ["  (nenhum exercício cadastrado neste treino)"];

  return [
    "Contexto real do treino que originou esta conversa:",
    `- Nome: ${workout.title}`,
    `- Objetivo/foco: ${workout.description ?? "não informado"}`,
    "- Exercícios:",
    ...exerciseLines,
  ].join("\n");
}

/** Builds the enriched (hidden) AI content from the real workout data. */
function buildWorkoutUnderstandPrompt(
  workout: StudentWorkoutDetail,
  visibleMessage: string,
): string {
  return [
    "O usuário abriu o gatilho contextual 'Entender este treino' no app Move.",
    "",
    "Mensagem visível do usuário:",
    visibleMessage,
    "",
    buildWorkoutContextBlock(workout),
    "",
    "Tarefa:",
    "Explique este treino em linguagem simples, curta e organizada.",
    "",
    "Formato da resposta (siga exatamente):",
    "- NÃO use títulos com # ou ### (Markdown de heading).",
    "- Use seções curtas com negrito simples, exatamente assim:",
    "  **Foco geral**",
    "  **Como o treino está organizado**",
    "  **Cuidados práticos**",
    "- Liste os exercícios como bullets, com o nome em negrito, por exemplo:",
    "  - **Abdução no Cross:** foco em glúteos.",
    "  - **Desenvolvimento na Máquina:** foco em ombros.",
    "- Em 'Cuidados práticos', dê 2 ou 3 itens curtos.",
    "- Evite Markdown avançado (sem tabelas, sem headings, sem links).",
    "",
    "Regras:",
    "Não prescreva alterações.",
    "Não troque exercícios.",
    "Não invente dados.",
    "Se o usuário quiser mudar o treino, oriente falar com o personal.",
  ].join("\n");
}

/**
 * "Entender este treino" — fetches the student's own workout and builds the
 * hidden enriched content. Ownership is enforced by WorkoutService: a non-student
 * or a workout that is not the user's resolves to chat_context_not_found.
 */
export class WorkoutUnderstandTrigger implements ChatContextTriggerBuilder {
  readonly id = "workout_understand";

  constructor(private readonly workoutService: WorkoutService) {}

  async build(input: ChatContextTriggerInput): Promise<ChatContextTriggerResult> {
    let workout: StudentWorkoutDetail;

    try {
      const response = await this.workoutService.getStudentWorkout(
        { userId: input.userId },
        input.entityId,
      );
      workout = response.workout;
    } catch (error: unknown) {
      if (
        error instanceof ApiError &&
        (error.code === "student_workout_not_found" ||
          error.code === "student_access_required")
      ) {
        // Hide whether the workout exists or the user is a student.
        throw CHAT_CONTEXT_NOT_FOUND;
      }
      throw error;
    }

    return {
      visibleMessage: input.visibleMessage,
      aiUserContent: buildWorkoutUnderstandPrompt(workout, input.visibleMessage),
      persistentContext: buildWorkoutContextBlock(workout),
      contextLabel: workout.title,
    };
  }
}
