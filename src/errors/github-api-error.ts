import { AppError } from "./app-error.js";
import type { AppErrorParams } from "./types.js";

export class GitHubAPIError extends AppError {
  constructor(params: Omit<AppErrorParams, "code">) {
    super({ ...params, code: "GITHUB_API_ERROR" });
  }
}
