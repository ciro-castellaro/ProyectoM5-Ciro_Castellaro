import { AppError } from "./app-error.js";

export class NetworkError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: "NETWORK_ERROR", message, retryable: true, details });
  }
}
