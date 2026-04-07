import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { bitbucketClient } from "../bitbucket-client.js";
import { getWorkspace } from "../auth.js";

const workspaceParam = z
  .string()
  .optional()
  .describe("Workspace slug (defaults to BITBUCKET_WORKSPACE env var)");

export function registerPullRequestTools(server: McpServer) {
  server.registerTool(
    "list_pull_requests",
    {
      description: "List pull requests in a Bitbucket repository filtered by state",
      inputSchema: {
        workspace: workspaceParam,
        repo_slug: z.string().describe("Repository slug"),
        state: z
          .enum(["OPEN", "MERGED", "DECLINED", "SUPERSEDED"])
          .default("OPEN")
          .describe("PR state filter"),
        page: z.number().int().positive().default(1).describe("Page number"),
        pagelen: z.number().int().min(1).max(100).default(50).describe("Results per page (max 100)"),
        query: z.string().optional().describe('Bitbucket filter query, e.g. title ~ "fix"'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ workspace, repo_slug, state, page, pagelen, query }) => {
      const ws = getWorkspace(workspace);
      const data = await bitbucketClient.listPullRequests(ws, repo_slug, state, page, pagelen, query);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_pull_request",
    {
      description:
        "Get full details of a pull request including description, reviewers, participants, source/destination branches, and merge status",
      inputSchema: {
        workspace: workspaceParam,
        repo_slug: z.string().describe("Repository slug"),
        pr_id: z.number().int().positive().describe("Pull request ID"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ workspace, repo_slug, pr_id }) => {
      const ws = getWorkspace(workspace);
      const data = await bitbucketClient.getPullRequest(ws, repo_slug, pr_id);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_pull_request_diff",
    {
      description: "Get the unified diff for a pull request (truncated at 100 KB for large PRs)",
      inputSchema: {
        workspace: workspaceParam,
        repo_slug: z.string().describe("Repository slug"),
        pr_id: z.number().int().positive().describe("Pull request ID"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ workspace, repo_slug, pr_id }) => {
      const ws = getWorkspace(workspace);
      const diff = await bitbucketClient.getPullRequestDiff(ws, repo_slug, pr_id);
      return { content: [{ type: "text", text: diff }] };
    }
  );

  server.registerTool(
    "list_pull_request_comments",
    {
      description: "List all review comments on a pull request",
      inputSchema: {
        workspace: workspaceParam,
        repo_slug: z.string().describe("Repository slug"),
        pr_id: z.number().int().positive().describe("Pull request ID"),
        page: z.number().int().positive().default(1).describe("Page number"),
        pagelen: z.number().int().min(1).max(100).default(50).describe("Results per page (max 100)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ workspace, repo_slug, pr_id, page, pagelen }) => {
      const ws = getWorkspace(workspace);
      const data = await bitbucketClient.listPullRequestComments(ws, repo_slug, pr_id, page, pagelen);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_pull_request_activity",
    {
      description: "Get the activity log for a pull request (approvals, updates, comments timeline)",
      inputSchema: {
        workspace: workspaceParam,
        repo_slug: z.string().describe("Repository slug"),
        pr_id: z.number().int().positive().describe("Pull request ID"),
        page: z.number().int().positive().default(1).describe("Page number"),
        pagelen: z.number().int().min(1).max(100).default(50).describe("Results per page (max 100)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ workspace, repo_slug, pr_id, page, pagelen }) => {
      const ws = getWorkspace(workspace);
      const data = await bitbucketClient.getPullRequestActivity(ws, repo_slug, pr_id, page, pagelen);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
