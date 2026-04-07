import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bitbucketClient } from "../bitbucket-client.js";
import { getWorkspace } from "../auth.js";

const workspaceParam = z
  .string()
  .optional()
  .describe("Workspace slug (defaults to BITBUCKET_WORKSPACE env var)");

export function registerFileTools(server: McpServer) {
  server.registerTool(
    "get_file_content",
    {
      description:
        "Get the raw content of a file from a Bitbucket repository at a specific branch or commit",
      inputSchema: {
        workspace: workspaceParam,
        repo_slug: z.string().describe("Repository slug"),
        path: z.string().describe("File path within the repository, e.g. src/index.ts"),
        ref: z.string().default("main").describe("Branch name or commit hash (defaults to main)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ workspace, repo_slug, path, ref }) => {
      const ws = getWorkspace(workspace);
      const content = await bitbucketClient.getFileContent(ws, repo_slug, ref, path);
      return { content: [{ type: "text", text: content }] };
    }
  );

  server.registerTool(
    "list_directory",
    {
      description: "List files and subdirectories at a path in a Bitbucket repository",
      inputSchema: {
        workspace: workspaceParam,
        repo_slug: z.string().describe("Repository slug"),
        path: z.string().default("").describe('Directory path, e.g. "src" or "" for the root'),
        ref: z.string().default("main").describe("Branch name or commit hash (defaults to main)"),
        page: z.number().int().positive().default(1).describe("Page number"),
        pagelen: z.number().int().min(1).max(100).default(100).describe("Results per page (max 100)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ workspace, repo_slug, path, ref, page, pagelen }) => {
      const ws = getWorkspace(workspace);
      const data = await bitbucketClient.listDirectory(ws, repo_slug, ref, path, page, pagelen);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_file_history",
    {
      description: "Get the commit history for a specific file path in a repository",
      inputSchema: {
        workspace: workspaceParam,
        repo_slug: z.string().describe("Repository slug"),
        path: z.string().describe("File path to get history for"),
        branch: z.string().default("main").describe("Branch to follow (defaults to main)"),
        page: z.number().int().positive().default(1).describe("Page number"),
        pagelen: z.number().int().min(1).max(100).default(30).describe("Results per page (max 100)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ workspace, repo_slug, path, branch, page, pagelen }) => {
      const ws = getWorkspace(workspace);
      const data = await bitbucketClient.getFileHistory(ws, repo_slug, branch, path, page, pagelen);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
