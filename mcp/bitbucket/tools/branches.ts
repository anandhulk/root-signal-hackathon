import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bitbucketClient } from "../bitbucket-client.js";
import { getWorkspace } from "../auth.js";

const workspaceParam = z
  .string()
  .optional()
  .describe("Workspace slug (defaults to BITBUCKET_WORKSPACE env var)");

export function registerBranchTools(server: McpServer) {
  server.registerTool(
    "list_branches",
    {
      description: "List all branches in a Bitbucket repository",
      inputSchema: {
        workspace: workspaceParam,
        repo_slug: z.string().describe("Repository slug"),
        page: z.number().int().positive().default(1).describe("Page number"),
        pagelen: z.number().int().min(1).max(100).default(50).describe("Results per page (max 100)"),
        query: z.string().optional().describe('Filter query, e.g. name ~ "feature"'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ workspace, repo_slug, page, pagelen, query }) => {
      const ws = getWorkspace(workspace);
      const data = await bitbucketClient.listBranches(ws, repo_slug, page, pagelen, query);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_branch",
    {
      description: "Get details of a specific branch including its tip commit",
      inputSchema: {
        workspace: workspaceParam,
        repo_slug: z.string().describe("Repository slug"),
        branch: z.string().describe("Branch name"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ workspace, repo_slug, branch }) => {
      const ws = getWorkspace(workspace);
      const data = await bitbucketClient.getBranch(ws, repo_slug, branch);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
