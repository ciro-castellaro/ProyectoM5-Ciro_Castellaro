import { toAppError } from "./to-app-error.js";
import type { FormattedError } from "./types.js";

export function formatToolError(error: unknown): FormattedError {
  return toAppError(error).toFormattedError();
}
