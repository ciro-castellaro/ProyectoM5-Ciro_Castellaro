import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GitHubClient } from "../github/operations.js";
import { registerCreateRepositoryTool } from "./create-repository.js";
import { registerCreateIssueTool } from "./create-issue.js";
import { registerListRepositoriesTool } from "./list-repositories.js";
import { registerCreateCommitTool } from "./create-commit.js";
import { registerListIssuesTool } from "./list-issues.js";

export function registerGitHubTools(server: McpServer, github: GitHubClient): void {
  registerCreateRepositoryTool(server, github);
  registerCreateIssueTool(server, github);
  registerListRepositoriesTool(server, github);
  registerCreateCommitTool(server, github);
  registerListIssuesTool(server, github);
}
