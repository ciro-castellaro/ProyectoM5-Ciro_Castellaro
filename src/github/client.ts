import { Octokit } from "@octokit/rest";
import { AuthenticationError } from "../errors/index.js";

export function createOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new AuthenticationError(
      "GITHUB_TOKEN no esta configurado. Definilo en tu archivo .env local antes de usar esta herramienta.",
    );
  }
  return new Octokit({
    auth: token,
    userAgent: "github-mcp-agent/1.0.0",
  });
}
