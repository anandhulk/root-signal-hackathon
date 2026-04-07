import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerCloudWatchTools,
  registerEcsTools,
  registerCodePipelineTools,
} from "./tools/index.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "aws-mcp",
    version: "0.1.0",
  });

  registerCloudWatchTools(server);
  registerEcsTools(server);
  registerCodePipelineTools(server);

  return server;
}
