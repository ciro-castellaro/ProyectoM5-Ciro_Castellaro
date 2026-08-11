export interface RepoDTO {
  name: string;
  fullName: string;
  htmlUrl: string;
  private: boolean;
  description: string | null;
  defaultBranch: string;
}

export interface IssueDTO {
  number: number;
  title: string;
  htmlUrl: string;
  state: string;
  body: string | null;
}

export interface CommitDTO {
  sha: string;
  htmlUrl: string;
  message: string;
}

interface RawRepo {
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  description?: string | null;
  default_branch?: string;
}

interface RawIssue {
  number: number;
  title: string;
  html_url: string;
  state: string;
  body?: string | null;
}

interface RawCommit {
  sha: string;
  html_url: string;
  message: string;
}

export function toRepoDTO(raw: RawRepo): RepoDTO {
  return {
    name: raw.name,
    fullName: raw.full_name,
    htmlUrl: raw.html_url,
    private: raw.private,
    description: raw.description ?? null,
    defaultBranch: raw.default_branch ?? "main",
  };
}

export function toIssueDTO(raw: RawIssue): IssueDTO {
  return {
    number: raw.number,
    title: raw.title,
    htmlUrl: raw.html_url,
    state: raw.state,
    body: raw.body ?? null,
  };
}

export function toCommitDTO(raw: RawCommit): CommitDTO {
  return {
    sha: raw.sha,
    htmlUrl: raw.html_url,
    message: raw.message,
  };
}
