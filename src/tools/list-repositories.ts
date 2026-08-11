import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listRepositoriesSchema } from "../schemas/index.js";
import type { GitHubClient } from "../github/operations.js";
import { formatToolError } from "../errors/index.js";
import { logger } from "../utils/logging.js";

export function registerListRepositoriesTool(server: McpServer, github: GitHubClient): void {
  server.registerTool(
    "list_repositories",
    {
      title: "Listar repositorios",
      description:
        "Lista los repositorios del usuario autenticado, con paginacion y orden configurables. Usar cuando el usuario pida ver que repositorios tiene, buscar uno por nombre, o confirmar si un repositorio ya existe antes de crearlo. No usar para ver los issues de un repositorio puntual (usar list_issues).",
      inputSchema: listRepositoriesSchema.shape,
    },
    async (rawArgs) => {
      const parsed = listRepositoriesSchema.safeParse(rawArgs);
      if (!parsed.success) {
        const message = parsed.error.issues.map((issue) => issue.message).join("; ");
        logger.warn("Validacion fallida en list_repositories", { message });
        return { isError: true, content: [{ type: "text" as const, text: message }] };
      }

      try {
        const repos = await github.listRepositories(parsed.data);
        if (repos.length === 0) {
          return { content: [{ type: "text" as const, text: "No se encontraron repositorios con esos filtros." }] };
        }
        const lines = repos.map(
          (repo) => `- ${repo.fullName} (${repo.private ? "privado" : "publico"}) — ${repo.htmlUrl}`,
        );
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        const formatted = formatToolError(error);
        logger.error("Error en list_repositories", { code: formatted.code });
        return { isError: true, content: [{ type: "text" as const, text: formatted.message }] };
      }
    },
  );
}
