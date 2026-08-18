import { AppError } from "./app-error.js";

export class AuthenticationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: "AUTHENTICATION_ERROR", message, retryable: false, details });
  }
}
