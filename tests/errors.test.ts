import { describe, it, expect } from "vitest";
import {
  AppError,
  AuthenticationError,
  GitHubAPIError,
  NetworkError,
  toAppError,
  formatToolError,
} from "../src/errors/index.js";

describe("toAppError", () => {
  it("returns the same instance when the error is already an AppError", () => {
    const original = new AuthenticationError("token invalido");
    expect(toAppError(original)).toBe(original);
  });

  it("classifies a 400 as a non-retryable GitHubAPIError", () => {
    const result = toAppError({ status: 400, message: "Bad request" });
    expect(result).toBeInstanceOf(GitHubAPIError);
    expect(result.retryable).toBe(false);
  });

  it("classifies a 401 as a non-retryable AuthenticationError", () => {
    const result = toAppError({ status: 401, message: "Bad credentials" });
    expect(result).toBeInstanceOf(AuthenticationError);
    expect(result.retryable).toBe(false);
  });

  it("classifies a 403 with rate limit exhausted as retryable", () => {
    const result = toAppError({
      status: 403,
      response: {
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "9999999999",
        },
      },
    });
    expect(result).toBeInstanceOf(GitHubAPIError);
    expect(result.retryable).toBe(true);
  });

  it("classifies a 403 without rate limit info as insufficient permissions, not retryable", () => {
    const result = toAppError({
      status: 403,
      response: { headers: { "x-ratelimit-remaining": "10" } },
    });
    expect(result).toBeInstanceOf(GitHubAPIError);
    expect(result.retryable).toBe(false);
    expect(result.message).toContain("permisos");
  });

  it("classifies a 404 with a clear, actionable message", () => {
    const result = toAppError({ status: 404, message: "Not Found" });
    expect(result.message).toContain("no fue encontrado");
    expect(result.retryable).toBe(false);
  });

  it("classifies a 422 including the upstream message", () => {
    const result = toAppError({
      status: 422,
      response: { data: { message: "name already exists on this account" } },
    });
    expect(result.message).toContain("name already exists on this account");
  });

  it("sanitizes control characters and truncates oversized upstream messages", () => {
    const ansiEscape = String.fromCharCode(27);
    const malicious =
      "linea1\nlinea2" + ansiEscape + "[31mrojo" + "x".repeat(500);
    const result = toAppError({
      status: 422,
      response: { data: { message: malicious } },
    });
    expect(result.message).not.toContain("\n");
    expect(result.message).not.toContain(ansiEscape);
    expect(result.message.length).toBeLessThan(400);
    expect(result.message).toContain("…");
  });

  it("classifies a 5xx as retryable", () => {
    const result = toAppError({ status: 503, message: "Service Unavailable" });
    expect(result.retryable).toBe(true);
  });

  it("classifies a 429 (secondary rate limit) as retryable", () => {
    const result = toAppError({
      status: 429,
      response: { headers: { "retry-after": "30" } },
    });
    expect(result.retryable).toBe(true);
    expect(result.message).toContain("limite de solicitudes");
  });

  it("classifies a plain Error as a retryable NetworkError", () => {
    const result = toAppError(new Error("socket hang up"));
    expect(result).toBeInstanceOf(NetworkError);
    expect(result.retryable).toBe(true);
  });

  it("classifies a non-Error value as an internal AppError", () => {
    const result = toAppError("something went wrong");
    expect(result).toBeInstanceOf(AppError);
    expect(result.code).toBe("INTERNAL_ERROR");
  });
});

describe("formatToolError", () => {
  it("never exposes a stack trace, only the stable payload shape", () => {
    const formatted = formatToolError({
      status: 401,
      message: "Bad credentials",
    });
    expect(Object.keys(formatted).sort()).toEqual(
      ["action", "code", "details", "hint", "message", "retryable"].sort(),
    );
    expect(formatted).not.toHaveProperty("stack");
  });

  it("keeps the code and retryable flag consistent with the underlying AppError", () => {
    const formatted = formatToolError({ status: 404, message: "Not Found" });
    expect(formatted.code).toBe("GITHUB_API_ERROR");
    expect(formatted.retryable).toBe(false);
  });
});
