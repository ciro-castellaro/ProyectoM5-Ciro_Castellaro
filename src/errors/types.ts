export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "GITHUB_API_ERROR"
  | "NETWORK_ERROR"
  | "INTERNAL_ERROR";

export interface FormattedError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  action?: string;
  hint?: string;
  details?: Record<string, unknown>;
}

export interface AppErrorParams {
  code: ErrorCode;
  message: string;
  status?: number;
  retryable?: boolean;
  hint?: string;
  action?: string;
  details?: Record<string, unknown>;
}
