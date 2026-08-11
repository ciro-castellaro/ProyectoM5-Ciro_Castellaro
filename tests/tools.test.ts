import { describe, it, expect } from "vitest";
import {
  createRepositorySchema,
  createIssueSchema,
  listRepositoriesSchema,
  createCommitSchema,
  listIssuesSchema,
} from "../src/schemas/index.js";

describe("createRepositorySchema", () => {
  it("accepts a valid repository name", () => {
    const result = createRepositorySchema.safeParse({ name: "demo-api" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.private).toBe(false);
    }
  });

  it("rejects a name shorter than 3 characters", () => {
    const result = createRepositorySchema.safeParse({ name: "ab" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("al menos 3 caracteres");
    }
  });

  it("rejects a name with invalid characters", () => {
    const result = createRepositorySchema.safeParse({ name: "demo api!" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("letras, numeros");
    }
  });
});

describe("createIssueSchema", () => {
  it("accepts a valid issue payload", () => {
    const result = createIssueSchema.safeParse({
      owner: "ciro-castellaro",
      repo: "mcp-agent-test",
      title: "Bug en el login",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a payload without title", () => {
    const result = createIssueSchema.safeParse({
      owner: "ciro-castellaro",
      repo: "mcp-agent-test",
    });
    expect(result.success).toBe(false);
  });
});

describe("listRepositoriesSchema", () => {
  it("applies defaults when no input is given", () => {
    const result = listRepositoriesSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        page: 1,
        perPage: 30,
        sort: "updated",
        direction: "desc",
        type: "owner",
      });
    }
  });

  it("rejects an invalid sort value", () => {
    const result = listRepositoriesSchema.safeParse({ sort: "invalid-value" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("sort debe ser uno de");
    }
  });
});

describe("createCommitSchema", () => {
  it("accepts a complete commit payload", () => {
    const result = createCommitSchema.safeParse({
      owner: "ciro-castellaro",
      repo: "mcp-agent-test",
      branch: "main",
      path: "README.md",
      content: "# Hola",
      message: "Update README",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a payload missing the commit message", () => {
    const result = createCommitSchema.safeParse({
      owner: "ciro-castellaro",
      repo: "mcp-agent-test",
      branch: "main",
      path: "README.md",
      content: "# Hola",
    });
    expect(result.success).toBe(false);
  });
});

describe("listIssuesSchema", () => {
  it("applies the open state by default", () => {
    const result = listIssuesSchema.safeParse({ owner: "ciro-castellaro", repo: "mcp-agent-test" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe("open");
    }
  });

  it("rejects an invalid state value", () => {
    const result = listIssuesSchema.safeParse({
      owner: "ciro-castellaro",
      repo: "mcp-agent-test",
      state: "archived",
    });
    expect(result.success).toBe(false);
  });
});
