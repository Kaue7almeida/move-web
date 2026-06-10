import { NextResponse } from "next/server";

import { ensureAuthenticated } from "@/bff/core/auth/ensureAuthenticated";
import { handleApiError } from "@/bff/core/errors/handleApiError";
import { makeWorkoutService } from "@/bff/modules/workouts/factories/makeWorkoutService";

export async function GET(request: Request) {
  try {
    const authContext = await ensureAuthenticated(request);
    const workoutService = makeWorkoutService();
    const result = await workoutService.listStudentGallery({
      userId: authContext.userId,
      email: authContext.email,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
