export type ApiErrorDetails = Record<string, string | number | boolean | null>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetails | null;

  constructor(status: number, code: string, message: string, details: ApiErrorDetails | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
