import type { Octokit } from "@octokit/rest";
import { withExponentialBackoff } from "../utils/retry.js";
import { logger } from "../utils/logging.js";
import { toAppError } from "../errors/index.js";
import { toRepoDTO, toIssueDTO, toCommitDTO, type RepoDTO, type IssueDTO, type CommitDTO } from "./dto.js";
import type {
  CreateRepositoryInput,
  CreateIssueInput,
  ListRepositoriesInput,
  CreateCommitInput,
  ListIssuesInput,
} from "../schemas/index.js";

function logRateLimit(headers: Record<string, string | number | undefined> | undefined): void {
  if (!headers) return;
  logger.debug("Estado de rate limit de GitHub", {
    remaining: headers["x-ratelimit-remaining"],
    limit: headers["x-ratelimit-limit"],
    reset: headers["x-ratelimit-reset"],
  });
}

export type CreateRepositoryParams = CreateRepositoryInput;
export type CreateIssueParams = CreateIssueInput;
export type ListRepositoriesParams = ListRepositoriesInput;
export type CreateCommitParams = CreateCommitInput;
export type ListIssuesParams = ListIssuesInput;

export class GitHubClient {
  constructor(private readonly octokit: Octokit) {}

  async getRepository(owner: string, repo: string): Promise<RepoDTO> {
    return withExponentialBackoff(async () => {
      try {
        const response = await this.octokit.repos.get({ owner, repo });
        logRateLimit(response.headers);
        return toRepoDTO(response.data);
      } catch (error) {
        throw toAppError(error);
      }
    });
  }

  async createRepository(params: CreateRepositoryParams): Promise<RepoDTO> {
    return withExponentialBackoff(async () => {
      try {
        const response = await this.octokit.repos.createForAuthenticatedUser({
          name: params.name,
          description: params.description,
          private: params.private,
          auto_init: true,
        });
        logRateLimit(response.headers);
        return toRepoDTO(response.data);
      } catch (error) {
        throw toAppError(error);
      }
    });
  }

  async listRepositories(params: ListRepositoriesParams): Promise<RepoDTO[]> {
    return withExponentialBackoff(async () => {
      try {
        const response = await this.octokit.repos.listForAuthenticatedUser({
          page: params.page,
          per_page: params.perPage,
          sort: params.sort,
          direction: params.direction,
          type: params.type,
        });
        logRateLimit(response.headers);
        return response.data.map(toRepoDTO);
      } catch (error) {
        throw toAppError(error);
      }
    });
  }

  async createIssue(params: CreateIssueParams): Promise<IssueDTO> {
    await this.getRepository(params.owner, params.repo);
    return withExponentialBackoff(async () => {
      try {
        const response = await this.octokit.issues.create({
          owner: params.owner,
          repo: params.repo,
          title: params.title,
          body: params.body,
          labels: params.labels,
          assignees: params.assignees,
        });
        logRateLimit(response.headers);
        return toIssueDTO(response.data);
      } catch (error) {
        throw toAppError(error);
      }
    });
  }

  async listIssues(params: ListIssuesParams): Promise<IssueDTO[]> {
    await this.getRepository(params.owner, params.repo);
    return withExponentialBackoff(async () => {
      try {
        const response = await this.octokit.issues.listForRepo({
          owner: params.owner,
          repo: params.repo,
          state: params.state,
          labels: params.labels?.join(","),
          page: params.page,
          per_page: params.perPage,
        });
        logRateLimit(response.headers);
        return response.data.filter((issue) => !issue.pull_request).map(toIssueDTO);
      } catch (error) {
        throw toAppError(error);
      }
    });
  }

  /**
   * Flujo de Git internals de 6 pasos: getRef -> getCommit -> createBlob ->
   * createTree -> createCommit -> updateRef. Es el unico camino soportado por
   * la API REST de GitHub para crear un commit sin clonar el repo localmente.
   */
  async createCommit(params: CreateCommitParams): Promise<CommitDTO> {
    await this.getRepository(params.owner, params.repo);
    return withExponentialBackoff(async () => {
      try {
        const { owner, repo, branch, path, content, message } = params;

        const refResponse = await this.octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
        const baseCommitSha = refResponse.data.object.sha;

        const baseCommitResponse = await this.octokit.git.getCommit({ owner, repo, commit_sha: baseCommitSha });
        const baseTreeSha = baseCommitResponse.data.tree.sha;

        const blobResponse = await this.octokit.git.createBlob({
          owner,
          repo,
          content: Buffer.from(content, "utf-8").toString("base64"),
          encoding: "base64",
        });

        const treeResponse = await this.octokit.git.createTree({
          owner,
          repo,
          base_tree: baseTreeSha,
          tree: [{ path, mode: "100644", type: "blob", sha: blobResponse.data.sha }],
        });

        const commitResponse = await this.octokit.git.createCommit({
          owner,
          repo,
          message,
          tree: treeResponse.data.sha,
          parents: [baseCommitSha],
        });

        // force: false (default de la API, explicitado): solo fast-forward,
        // nunca reescribir historia ni pisar commits concurrentes.
        await this.octokit.git.updateRef({
          owner,
          repo,
          ref: `heads/${branch}`,
          sha: commitResponse.data.sha,
          force: false,
        });

        return toCommitDTO(commitResponse.data);
      } catch (error) {
        throw toAppError(error);
      }
    });
  }
}
