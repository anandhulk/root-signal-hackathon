import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerRepositoryTools,
  registerBranchTools,
  registerCommitTools,
  registerPullRequestTools,
  registerFileTools,
} from "./tools/index.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "bitbucket-mcp",
    version: "0.1.0",
  });

  registerRepositoryTools(server);
  registerBranchTools(server);
  registerCommitTools(server);
  registerPullRequestTools(server);
  registerFileTools(server);

  return server;
}
