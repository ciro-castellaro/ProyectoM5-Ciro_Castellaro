import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listIssuesSchema } from "../schemas/index.js";
import type { GitHubClient } from "../github/operations.js";
import { formatToolError } from "../errors/index.js";
import { logger } from "../utils/logging.js";

export function registerListIssuesTool(server: McpServer, github: GitHubClient): void {
  server.registerTool(
    "list_issues",
    {
      title: "Listar issues",
      description:
        "Lista los issues de un repositorio especifico de GitHub, filtrando por estado y labels. Usar cuando el usuario pida ver los issues abiertos/cerrados de un repositorio puntual. Requiere owner y repo exactos.",
      inputSchema: listIssuesSchema.shape,
    },
    async (rawArgs) => {
      const parsed = listIssuesSchema.safeParse(rawArgs);
      if (!parsed.success) {
        const message = parsed.error.issues.map((issue) => issue.message).join("; ");
        logger.warn("Validacion fallida en list_issues", { message });
        return { isError: true, content: [{ type: "text" as const, text: message }] };
      }

      try {
        const issues = await github.listIssues(parsed.data);
        if (issues.length === 0) {
          return { content: [{ type: "text" as const, text: "No se encontraron issues con esos filtros." }] };
        }
        const lines = issues.map(
          (issue) => `- #${issue.number} [${issue.state}] ${issue.title} — ${issue.htmlUrl}`,
        );
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        const formatted = formatToolError(error);
        logger.error("Error en list_issues", { code: formatted.code });
        return { isError: true, content: [{ type: "text" as const, text: formatted.message }] };
      }
    },
  );
}
