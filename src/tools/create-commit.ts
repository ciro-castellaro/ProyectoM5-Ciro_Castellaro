import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createCommitSchema } from "../schemas/index.js";
import type { GitHubClient } from "../github/operations.js";
import { formatToolError } from "../errors/index.js";
import { logger } from "../utils/logging.js";

export function registerCreateCommitTool(server: McpServer, github: GitHubClient): void {
  server.registerTool(
    "create_commit",
    {
      title: "Crear commit",
      description:
        "Agrega o modifica un archivo en un repositorio de GitHub mediante un commit directo sobre una rama existente. Usar cuando el usuario pida subir/actualizar el contenido de un archivo puntual. Requiere owner, repo, branch, path del archivo, contenido completo del archivo y mensaje de commit. No crea la rama si no existe: la rama debe existir previamente (los repos creados con create_repository ya tienen la rama main lista). No usar para crear un repositorio nuevo (usar create_repository).",
      inputSchema: createCommitSchema.shape,
    },
    async (rawArgs) => {
      const parsed = createCommitSchema.safeParse(rawArgs);
      if (!parsed.success) {
        const message = parsed.error.issues.map((issue) => issue.message).join("; ");
        logger.warn("Validacion fallida en create_commit", { message });
        return { isError: true, content: [{ type: "text" as const, text: message }] };
      }

      try {
        const commit = await github.createCommit(parsed.data);
        return {
          content: [
            {
              type: "text" as const,
              text: `Commit creado: ${commit.sha} — "${commit.message}" (${commit.htmlUrl}).`,
            },
          ],
        };
      } catch (error) {
        const formatted = formatToolError(error);
        logger.error("Error en create_commit", { code: formatted.code });
        return { isError: true, content: [{ type: "text" as const, text: formatted.message }] };
      }
    },
  );
}
