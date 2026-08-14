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

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: "VALIDATION_ERROR", message, retryable: false, details });
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: "AUTHENTICATION_ERROR", message, retryable: false, details });
  }
}

export class GitHubAPIError extends AppError {
  constructor(params: Omit<AppErrorParams, "code">) {
    super({ ...params, code: "GITHUB_API_ERROR" });
  }
}

export class NetworkError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: "NETWORK_ERROR", message, retryable: true, details });
  }
}

interface OctokitLikeError {
  status?: number;
  message?: string;
  response?: {
    headers?: Record<string, string | number | undefined>;
    data?: { message?: string };
  };
}

function isOctokitError(error: unknown): error is OctokitLikeError {
  return typeof error === "object" && error !== null && "status" in error;
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (isOctokitError(error)) {
    const status = error.status;
    const upstreamMessage = error.response?.data?.message ?? error.message ?? "Error desconocido de GitHub";

    if (status === 401) {
      return new AuthenticationError(
        "El token de GitHub es invalido o expiro. Verifica GITHUB_TOKEN en tu archivo .env local.",
        { status },
      );
    }

    if (status === 403) {
      const remaining = error.response?.headers?.["x-ratelimit-remaining"];
      if (String(remaining) === "0") {
        return new GitHubAPIError({
          message: "Se alcanzo el limite de solicitudes de la API de GitHub. Intenta de nuevo en unos minutos.",
          status,
          retryable: true,
          hint: "Revisa el header x-ratelimit-reset para saber cuando se libera el limite",
          action: "Esperar antes de reintentar",
          details: { rateLimitReset: error.response?.headers?.["x-ratelimit-reset"] },
        });
      }
      return new GitHubAPIError({
        message: "El token no tiene permisos suficientes para esta operacion.",
        status,
        retryable: false,
        hint: "Revisa que el Personal Access Token tenga los scopes repo y user",
        action: "Revisar los scopes del token",
      });
    }

    if (status === 404) {
      return new GitHubAPIError({
        message: "El recurso solicitado no fue encontrado en GitHub. Verifica el owner y el nombre del repositorio.",
        status,
        retryable: false,
        action: "Verificar owner/repo e intentar de nuevo",
      });
    }

    if (status === 422) {
      return new GitHubAPIError({
        message: `GitHub rechazo la solicitud: ${upstreamMessage}`,
        status,
        retryable: false,
        hint: "Revisa que el nombre no este duplicado y que los datos enviados sean validos",
      });
    }

    if (typeof status === "number" && status >= 500) {
      return new GitHubAPIError({
        message: "GitHub esta teniendo problemas temporales. Intenta de nuevo en unos momentos.",
        status,
        retryable: true,
      });
    }

    if (status === 429) {
      return new GitHubAPIError({
        message: "Se alcanzo el limite de solicitudes de la API de GitHub. Intenta de nuevo en unos minutos.",
        status,
        retryable: true,
        hint: "Revisa el header retry-after para saber cuanto esperar",
        action: "Esperar antes de reintentar",
        details: { retryAfter: error.response?.headers?.["retry-after"] },
      });
    }

    return new GitHubAPIError({
      message: `Error al comunicarse con GitHub: ${upstreamMessage}`,
      status,
      retryable: false,
    });
  }

  if (error instanceof Error) {
    return new NetworkError("No se pudo completar la operacion por un problema de red o interno.");
  }

  return new AppError({ code: "INTERNAL_ERROR", message: "Ocurrio un error inesperado.", retryable: false });
}

export function formatToolError(error: unknown): FormattedError {
  return toAppError(error).toFormattedError();
}
