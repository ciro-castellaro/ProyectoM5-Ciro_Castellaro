import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRepositorySchema } from "../schemas/index.js";
import type { GitHubClient } from "../github/operations.js";
import { formatToolError } from "../errors/index.js";
import { logger } from "../utils/logging.js";

export function registerCreateRepositoryTool(server: McpServer, github: GitHubClient): void {
  server.registerTool(
    "create_repository",
    {
      title: "Crear repositorio",
      description:
        "Crea un nuevo repositorio de GitHub en la cuenta autenticada. Usar cuando el usuario pida crear/iniciar un repositorio nuevo con un nombre especifico. No usar para repositorios que ya existen (usar list_repositories para verificar antes de crear uno nuevo).",
      inputSchema: createRepositorySchema.shape,
    },
    async (rawArgs) => {
      const parsed = createRepositorySchema.safeParse(rawArgs);
      if (!parsed.success) {
        const message = parsed.error.issues.map((issue) => issue.message).join("; ");
        logger.warn("Validacion fallida en create_repository", { message });
        return { isError: true, content: [{ type: "text" as const, text: message }] };
      }

      try {
        const repo = await github.createRepository(parsed.data);
        return {
          content: [
            {
              type: "text" as const,
              text: `Repositorio creado: ${repo.fullName} (${repo.htmlUrl}). Visibilidad: ${repo.private ? "privado" : "publico"}.`,
            },
          ],
        };
      } catch (error) {
        const formatted = formatToolError(error);
        logger.error("Error en create_repository", { code: formatted.code });
        return { isError: true, content: [{ type: "text" as const, text: formatted.message }] };
      }
    },
  );
}
