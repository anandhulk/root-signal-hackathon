import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bitbucketClient } from "../bitbucket-client.js";
import { getWorkspace } from "../auth.js";

const workspaceParam = z
  .string()
  .optional()
  .describe("Workspace slug (defaults to BITBUCKET_WORKSPACE env var)");

export function registerCommitTools(server: McpServer) {
  server.registerTool(
    "list_commits",
    {
      description: "List commits on a branch or revision in a Bitbucket repository",
      inputSchema: {
        workspace: workspaceParam,
        repo_slug: z.string().describe("Repository slug"),
        branch: z.string().describe("Branch name or commit hash to start listing from"),
        page: z.number().int().positive().default(1).describe("Page number"),
        pagelen: z.number().int().min(1).max(100).default(30).describe("Results per page (max 100)"),
        path: z.string().optional().describe("Limit commits to those touching this file path"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ workspace, repo_slug, branch, page, pagelen, path }) => {
      const ws = getWorkspace(workspace);
      const data = await bitbucketClient.listCommits(ws, repo_slug, branch, page, pagelen, path);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_commit",
    {
      description: "Get full metadata for a single commit including author, message, parents, and changed files",
      inputSchema: {
        workspace: workspaceParam,
        repo_slug: z.string().describe("Repository slug"),
        node: z.string().describe("Full or abbreviated commit hash"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ workspace, repo_slug, node }) => {
      const ws = getWorkspace(workspace);
      const data = await bitbucketClient.getCommit(ws, repo_slug, node);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_commit_diff",
    {
      description:
        'Get the unified diff introduced by a commit or between two commits (spec: single hash or "hash1..hash2")',
      inputSchema: {
        workspace: workspaceParam,
        repo_slug: z.string().describe("Repository slug"),
        spec: z.string().describe('Diff spec: a single commit hash, or "node1..node2" for a range'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ workspace, repo_slug, spec }) => {
      const ws = getWorkspace(workspace);
      const diff = await bitbucketClient.getCommitDiff(ws, repo_slug, spec);
      return { content: [{ type: "text", text: diff }] };
    }
  );
}
