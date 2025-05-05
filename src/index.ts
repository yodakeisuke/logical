import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "Logical Thinking MCP Server",
  version: "1.0.0",
  instructions: `
    Externalize logical thinking and always visualize the structure of the discussion
  `,
});

// server.tool();

async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

startServer().catch((error) => {
  console.error(error);
});