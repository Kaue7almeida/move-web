import { NextResponse } from "next/server";

import { ApiError } from "@/bff/core/errors/ApiError";

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
        ...(error.details ?? {}),
      },
      { status: error.status },
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: {
        code: "internal_server_error",
        message: "Erro interno do servidor.",
      },
    },
    { status: 500 },
  );
}
