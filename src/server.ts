import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createOctokit } from "./github/client.js";
import { GitHubClient } from "./github/operations.js";
import { registerGitHubTools } from "./tools/index.js";
import { logger } from "./utils/logging.js";

try {
  process.loadEnvFile();
} catch {
  // .env es opcional: si no existe, se espera que GITHUB_TOKEN venga ya definido
  // en el entorno del sistema (por ejemplo, interpolado desde la configuracion de Antigravity).
}

const server = new McpServer({
  name: "github-mcp-agent",
  version: "1.0.0",
});

server.registerTool(
  "ping",
  {
    title: "Ping",
    description:
      "Verifica que el MCP server esta activo y respondiendo correctamente. Usar solo para diagnostico de conexion (por ejemplo desde MCP Inspector); no ejecuta ninguna operacion real contra GitHub.",
    inputSchema: {},
  },
  async () => ({ content: [{ type: "text" as const, text: "pong" }] }),
);

async function main(): Promise<void> {
  const octokit = createOctokit();
  const github = new GitHubClient(octokit);
  registerGitHubTools(server, github);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("MCP server connected via stdio");
}

main().catch((error: unknown) => {
  logger.error("Fatal error during startup", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
