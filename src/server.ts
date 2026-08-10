import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

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
  async () => {
    return {
      content: [{ type: "text" as const, text: "pong" }],
    };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[github-mcp-agent] MCP server connected via stdio");
}

main().catch((error: unknown) => {
  console.error("[github-mcp-agent] Fatal error during startup:", error);
  process.exit(1);
});
