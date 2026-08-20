import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Octokit } from "@octokit/rest";
import { GitHubClient } from "../src/github/operations.js";
import { AuthenticationError, GitHubAPIError } from "../src/errors/index.js";

function createMockOctokit() {
  return {
    repos: {
      get: vi.fn(),
      createForAuthenticatedUser: vi.fn(),
      listForAuthenticatedUser: vi.fn(),
    },
    issues: {
      create: vi.fn(),
      listForRepo: vi.fn(),
    },
    git: {
      getRef: vi.fn(),
      getCommit: vi.fn(),
      createBlob: vi.fn(),
      createTree: vi.fn(),
      createCommit: vi.fn(),
      updateRef: vi.fn(),
    },
  };
}

type MockOctokit = ReturnType<typeof createMockOctokit>;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("GitHubClient.createRepository", () => {
  it("creates a repository with auto_init and maps it to a RepoDTO", async () => {
    const octokit = createMockOctokit();
    octokit.repos.createForAuthenticatedUser.mockResolvedValue({
      headers: { "x-ratelimit-remaining": "59" },
      data: {
        name: "demo-api",
        full_name: "ciro-castellaro/demo-api",
        html_url: "https://github.com/ciro-castellaro/demo-api",
        private: false,
        description: "demo",
        default_branch: "main",
      },
    });
    const github = new GitHubClient(octokit as unknown as Octokit);

    const repo = await github.createRepository({
      name: "demo-api",
      description: "demo",
      private: false,
    });

    expect(repo.fullName).toBe("ciro-castellaro/demo-api");
    expect(octokit.repos.createForAuthenticatedUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: "demo-api", auto_init: true }),
    );
  });
});

describe("GitHubClient.listRepositories", () => {
  it("maps every repository in the response to a RepoDTO", async () => {
    const octokit = createMockOctokit();
    octokit.repos.listForAuthenticatedUser.mockResolvedValue({
      headers: {},
      data: [
        {
          name: "demo-api",
          full_name: "ciro-castellaro/demo-api",
          html_url: "https://github.com/ciro-castellaro/demo-api",
          private: false,
          default_branch: "main",
        },
      ],
    });
    const github = new GitHubClient(octokit as unknown as Octokit);

    const repos = await github.listRepositories({
      page: 1,
      perPage: 30,
      sort: "updated",
      direction: "desc",
      type: "owner",
    });

    expect(repos).toHaveLength(1);
    expect(repos[0]?.name).toBe("demo-api");
  });
});

describe("GitHubClient.createIssue", () => {
  it("creates an issue when the repository exists", async () => {
    const octokit = createMockOctokit();
    octokit.repos.get.mockResolvedValue({
      headers: {},
      data: {
        name: "demo-api",
        full_name: "ciro-castellaro/demo-api",
        html_url: "https://github.com/x",
        private: false,
      },
    });
    octokit.issues.create.mockResolvedValue({
      headers: {},
      data: {
        number: 1,
        title: "Bug",
        html_url: "https://github.com/x/issues/1",
        state: "open",
      },
    });
    const github = new GitHubClient(octokit as unknown as Octokit);

    const issue = await github.createIssue({
      owner: "ciro-castellaro",
      repo: "demo-api",
      title: "Bug",
    });

    expect(issue.number).toBe(1);
    expect(octokit.issues.create).toHaveBeenCalled();
  });

  it("fails with a clear not-found error and never calls issues.create when the repository does not exist", async () => {
    const octokit = createMockOctokit();
    octokit.repos.get.mockRejectedValue({ status: 404, message: "Not Found" });
    const github = new GitHubClient(octokit as unknown as Octokit);

    await expect(
      github.createIssue({
        owner: "ciro-castellaro",
        repo: "no-existe",
        title: "Bug",
      }),
    ).rejects.toBeInstanceOf(GitHubAPIError);
    expect(octokit.issues.create).not.toHaveBeenCalled();
  });
});

describe("GitHubClient.listIssues", () => {
  it("filters out pull requests from the results", async () => {
    const octokit = createMockOctokit();
    octokit.repos.get.mockResolvedValue({
      headers: {},
      data: {
        name: "demo-api",
        full_name: "ciro-castellaro/demo-api",
        html_url: "https://github.com/x",
        private: false,
      },
    });
    octokit.issues.listForRepo.mockResolvedValue({
      headers: {},
      data: [
        {
          number: 1,
          title: "Issue real",
          html_url: "https://github.com/x/1",
          state: "open",
        },
        {
          number: 2,
          title: "Es un PR",
          html_url: "https://github.com/x/2",
          state: "open",
          pull_request: {},
        },
      ],
    });
    const github = new GitHubClient(octokit as unknown as Octokit);

    const issues = await github.listIssues({
      owner: "ciro-castellaro",
      repo: "demo-api",
      state: "open",
      page: 1,
      perPage: 30,
      sort: "created",
      direction: "desc",
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.number).toBe(1);
  });
});

describe("GitHubClient.createCommit", () => {
  it("runs the 6-step Git internals flow and returns the resulting commit", async () => {
    const octokit = createMockOctokit();
    octokit.repos.get.mockResolvedValue({
      headers: {},
      data: {
        name: "demo-api",
        full_name: "ciro-castellaro/demo-api",
        html_url: "https://github.com/x",
        private: false,
      },
    });
    octokit.git.getRef.mockResolvedValue({
      data: { object: { sha: "base-sha" } },
    });
    octokit.git.getCommit.mockResolvedValue({
      data: { tree: { sha: "base-tree-sha" } },
    });
    octokit.git.createBlob.mockResolvedValue({ data: { sha: "blob-sha" } });
    octokit.git.createTree.mockResolvedValue({ data: { sha: "new-tree-sha" } });
    octokit.git.createCommit.mockResolvedValue({
      data: {
        sha: "new-commit-sha",
        html_url: "https://github.com/x/commit/new-commit-sha",
        message: "Add file",
      },
    });
    octokit.git.updateRef.mockResolvedValue({ data: {} });
    const github = new GitHubClient(octokit as unknown as Octokit);

    const commit = await github.createCommit({
      owner: "ciro-castellaro",
      repo: "demo-api",
      branch: "main",
      path: "test.md",
      content: "hello",
      message: "Add file",
    });

    expect(commit.sha).toBe("new-commit-sha");
    expect(octokit.git.createBlob).toHaveBeenCalledWith(
      expect.objectContaining({
        content: Buffer.from("hello", "utf-8").toString("base64"),
        encoding: "base64",
      }),
    );
    expect(octokit.git.updateRef).toHaveBeenCalledWith(
      expect.objectContaining({ ref: "heads/main", sha: "new-commit-sha" }),
    );
  });
});

describe("GitHubClient error handling", () => {
  it("propagates a 401 as a non-retryable AuthenticationError without retrying", async () => {
    const octokit = createMockOctokit();
    octokit.repos.get.mockRejectedValue({
      status: 401,
      message: "Bad credentials",
    });
    const github = new GitHubClient(octokit as unknown as Octokit);

    await expect(
      github.getRepository("ciro-castellaro", "demo-api"),
    ).rejects.toBeInstanceOf(AuthenticationError);
    expect(octokit.repos.get).toHaveBeenCalledTimes(1);
  });

  it("retries a retryable error and eventually succeeds", async () => {
    vi.useFakeTimers();
    const octokit = createMockOctokit();
    octokit.repos.get
      .mockRejectedValueOnce({ status: 500, message: "Internal Server Error" })
      .mockResolvedValueOnce({
        headers: {},
        data: {
          name: "demo-api",
          full_name: "ciro-castellaro/demo-api",
          html_url: "https://github.com/x",
          private: false,
        },
      });
    const github = new GitHubClient(octokit as unknown as Octokit);

    const resultPromise = github.getRepository("ciro-castellaro", "demo-api");
    await vi.advanceTimersByTimeAsync(1000);
    const repo = await resultPromise;

    expect(repo.fullName).toBe("ciro-castellaro/demo-api");
    expect(octokit.repos.get).toHaveBeenCalledTimes(2);
  });

  it("caps a malicious retry-after header instead of sleeping indefinitely", async () => {
    vi.useFakeTimers();
    const octokit = createMockOctokit();
    octokit.repos.get
      .mockRejectedValueOnce({
        status: 500,
        message: "Internal Server Error",
        response: { headers: { "retry-after": "9999999" } },
      })
      .mockResolvedValueOnce({
        headers: {},
        data: {
          name: "demo-api",
          full_name: "ciro-castellaro/demo-api",
          html_url: "https://github.com/x",
          private: false,
        },
      });
    const github = new GitHubClient(octokit as unknown as Octokit);

    const resultPromise = github.getRepository("ciro-castellaro", "demo-api");
    // Sin el tope, el retry esperaria ~9999999s; con el tope alcanza avanzar 60s.
    await vi.advanceTimersByTimeAsync(60_000);
    const repo = await resultPromise;

    expect(repo.fullName).toBe("ciro-castellaro/demo-api");
    expect(octokit.repos.get).toHaveBeenCalledTimes(2);
  });
});
