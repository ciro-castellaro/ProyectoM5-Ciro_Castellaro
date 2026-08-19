import { AppError } from "./app-error.js";
import { AuthenticationError } from "./authentication-error.js";
import { GitHubAPIError } from "./github-api-error.js";
import { NetworkError } from "./network-error.js";

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

// El mensaje upstream es contenido externo que termina leyendo el LLM:
// se quitan caracteres de control y se acota la longitud antes de reenviarlo.
const MAX_UPSTREAM_MESSAGE_LENGTH = 300;

function sanitizeUpstreamMessage(message: string): string {
  const cleaned = message.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
  if (cleaned.length === 0) return "Error desconocido de GitHub";
  return cleaned.length > MAX_UPSTREAM_MESSAGE_LENGTH
    ? `${cleaned.slice(0, MAX_UPSTREAM_MESSAGE_LENGTH)}…`
    : cleaned;
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (isOctokitError(error)) {
    const status = error.status;
    const upstreamMessage = sanitizeUpstreamMessage(
      error.response?.data?.message ??
        error.message ??
        "Error desconocido de GitHub",
    );

    if (status === 400) {
      return new GitHubAPIError({
        message: `Solicitud invalida a la API de GitHub: ${upstreamMessage}`,
        status,
        retryable: false,
      });
    }

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
          message:
            "Se alcanzo el limite de solicitudes de la API de GitHub. Intenta de nuevo en unos minutos.",
          status,
          retryable: true,
          hint: "Revisa el header x-ratelimit-reset para saber cuando se libera el limite",
          action: "Esperar antes de reintentar",
          details: {
            rateLimitReset: error.response?.headers?.["x-ratelimit-reset"],
          },
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
        message:
          "El recurso solicitado no fue encontrado en GitHub. Verifica el owner y el nombre del repositorio.",
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
        message:
          "GitHub esta teniendo problemas temporales. Intenta de nuevo en unos momentos.",
        status,
        retryable: true,
      });
    }

    if (status === 429) {
      return new GitHubAPIError({
        message:
          "Se alcanzo el limite de solicitudes de la API de GitHub. Intenta de nuevo en unos minutos.",
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
    return new NetworkError(
      "No se pudo completar la operacion por un problema de red o interno.",
    );
  }

  return new AppError({
    code: "INTERNAL_ERROR",
    message: "Ocurrio un error inesperado.",
    retryable: false,
  });
}
