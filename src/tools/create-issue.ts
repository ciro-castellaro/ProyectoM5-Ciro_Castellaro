import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createIssueSchema } from "../schemas/index.js";
import type { GitHubClient } from "../github/operations.js";
import { formatToolError } from "../errors/index.js";
import { logger } from "../utils/logging.js";

export function registerCreateIssueTool(server: McpServer, github: GitHubClient): void {
  server.registerTool(
    "create_issue",
    {
      title: "Crear issue",
      description:
        "Abre un nuevo issue en un repositorio existente de GitHub. Requiere owner y repo exactos del repositorio destino. Usar cuando el usuario pida reportar un bug, pedir una funcionalidad o abrir una tarea en un repositorio puntual. No usar para comentar en un issue ya existente.",
      inputSchema: createIssueSchema.shape,
    },
    async (rawArgs) => {
      const parsed = createIssueSchema.safeParse(rawArgs);
      if (!parsed.success) {
        const message = parsed.error.issues.map((issue) => issue.message).join("; ");
        logger.warn("Validacion fallida en create_issue", { message });
        return { isError: true, content: [{ type: "text" as const, text: message }] };
      }

      try {
        const issue = await github.createIssue(parsed.data);
        return {
          content: [
            {
              type: "text" as const,
              text: `Issue #${issue.number} creado: "${issue.title}" (${issue.htmlUrl}).`,
            },
          ],
        };
      } catch (error) {
        const formatted = formatToolError(error);
        logger.error("Error en create_issue", { code: formatted.code });
        return { isError: true, content: [{ type: "text" as const, text: formatted.message }] };
      }
    },
  );
}
