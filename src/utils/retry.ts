import { toAppError } from "../errors/index.js";
import { logger } from "./logging.js";

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

interface HeadersLike {
  response?: {
    headers?: Record<string, string | number | undefined>;
  };
}

// Tope al delay sugerido por headers: un Retry-After corrupto o malicioso no
// debe poder dormir el proceso indefinidamente.
const MAX_HEADER_DELAY_MS = 60_000;

function getRetryAfterMs(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const headers = (error as HeadersLike).response?.headers;
  if (!headers) return undefined;

  const retryAfter = headers["retry-after"];
  if (retryAfter !== undefined) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, MAX_HEADER_DELAY_MS);
    }
  }

  const reset = headers["x-ratelimit-reset"];
  if (reset !== undefined) {
    const resetMs = Number(reset) * 1000;
    const delta = resetMs - Date.now();
    if (delta > 0) return Math.min(delta, MAX_HEADER_DELAY_MS);
  }

  return undefined;
}

export async function withExponentialBackoff<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 8000;

  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      const appError = toAppError(error);
      if (!appError.retryable || attempt >= maxRetries) {
        throw appError;
      }
      const headerDelay = getRetryAfterMs(error);
      const backoffDelay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const delay = headerDelay ?? backoffDelay;
      logger.warn("Reintentando operacion tras error recuperable", {
        attempt: attempt + 1,
        delayMs: delay,
        code: appError.code,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt += 1;
    }
  }
}
