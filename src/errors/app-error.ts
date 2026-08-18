import type { AppErrorParams, ErrorCode, FormattedError } from "./types.js";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status?: number;
  readonly retryable: boolean;
  readonly hint?: string;
  readonly action?: string;
  readonly details?: Record<string, unknown>;

  constructor(params: AppErrorParams) {
    super(params.message);
    this.name = new.target.name;
    this.code = params.code;
    this.status = params.status;
    this.retryable = params.retryable ?? false;
    this.hint = params.hint;
    this.action = params.action;
    this.details = params.details;
  }

  toFormattedError(): FormattedError {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      action: this.action,
      hint: this.hint,
      details: this.details,
    };
  }
}
