import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { treeTool } from "./tool/tree/tool.js";
import { issueTool } from "./tool/issue/tool.js";

const server = new McpServer({
  name: "Logical Thinking MCP Server",
  version: "1.0.0",
  instructions: `
    Externalize logical thinking and always visualize the structure of the discussion
  `,
});
  
server.tool(
  treeTool.name, 
  treeTool.description, 
  treeTool.parameters, 
  treeTool.execute
);

server.tool(
  issueTool.name, 
  issueTool.description, 
  issueTool.parameters, 
  issueTool.execute
);

async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}


startServer().catch((error) => {
  console.error(error);
});