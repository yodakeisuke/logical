import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { issueTool } from "./tool/issue/issue.js";
import { parametersSchema as issueSchemaShape } from "./tool/issue/schema.js";
import { breakdownTool } from "./tool/breakdown/breakdown.js";
import { parametersSchema as breakdownParametersSchema } from "./tool/breakdown/schema.js";
import { treeTool } from "./tool/tree/tree.js";
import { parametersSchema as treeParametersSchema } from "./tool/tree/schema.js";
import { z } from "zod";

const server = new McpServer({
  name: "Logical Thinking MCP Server",
  version: "1.0.0",
  instructions: `
    Externalize logical thinking and always visualize the structure of the discussion
  `,
});

server.tool(
  issueTool.name,
  issueTool.description,
  issueSchemaShape.shape,
  (args: z.infer<typeof issueSchemaShape>) => issueTool.execute(args)
);

server.tool(
  breakdownTool.name,
  breakdownTool.description,
  breakdownParametersSchema.shape,
  (args: z.infer<typeof breakdownParametersSchema>) => breakdownTool.execute(args)
);

server.tool(
  treeTool.name,
  treeTool.description,
  treeParametersSchema.shape,
  (args: z.infer<typeof treeParametersSchema>) => treeTool.execute(args)
);

async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

startServer().catch((error) => {
  console.error(error);
});