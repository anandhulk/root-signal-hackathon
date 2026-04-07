import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bitbucketClient } from "../bitbucket-client.js";
import { getWorkspace } from "../auth.js";

const workspaceParam = z
  .string()
  .optional()
  .describe("Workspace slug (defaults to BITBUCKET_WORKSPACE env var)");

export function registerRepositoryTools(server: McpServer) {
  server.registerTool(
    "list_workspaces",
    {
      description: "List all Bitbucket workspaces the authenticated user belongs to",
      inputSchema: {
        page: z.number().int().positive().default(1).describe("Page number"),
        pagelen: z.number().int().min(1).max(100).default(50).describe("Results per page (max 100)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ page, pagelen }) => {
      const data = await bitbucketClient.listWorkspaces(page, pagelen);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "list_repositories",
    {
      description:
        'List repositories in a Bitbucket workspace. Supports server-side filtering with Bitbucket query syntax (e.g. name ~ "api").',
      inputSchema: {
        workspace: workspaceParam,
        page: z.number().int().positive().default(1).describe("Page number"),
        pagelen: z.number().int().min(1).max(100).default(50).describe("Results per page (max 100)"),
        query: z.string().optional().describe('Bitbucket query filter, e.g. name ~ "service" AND language = "python"'),
        sort: z.string().optional().describe('Sort field, e.g. "updated_on" or "-name"'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ workspace, page, pagelen, query, sort }) => {
      const ws = getWorkspace(workspace);
      const data = await bitbucketClient.listRepositories(ws, page, pagelen, query, sort);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_repository",
    {
      description:
        "Get full metadata for a single Bitbucket repository (description, language, size, links, default branch, etc.)",
      inputSchema: {
        workspace: workspaceParam,
        repo_slug: z.string().describe("Repository slug"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ workspace, repo_slug }) => {
      const ws = getWorkspace(workspace);
      const data = await bitbucketClient.getRepository(ws, repo_slug);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
