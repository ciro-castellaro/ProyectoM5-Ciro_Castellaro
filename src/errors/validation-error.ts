import { AppError } from "./app-error.js";

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: "VALIDATION_ERROR", message, retryable: false, details });
  }
}
