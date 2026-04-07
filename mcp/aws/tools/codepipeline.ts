import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { codepipelineMethods } from "../methods/codepipeline.js";

function stripServiceEnvironmentSuffix(serviceName: string): string {
  return serviceName.replace(/-(qa\d*|staging|stage|prod|production|dev|test|uat)$/i, "");
}

function toIso(value?: Date): string | undefined {
  return value ? value.toISOString() : undefined;
}

function getStageLastUpdated(stage: { actionStates?: Array<{ latestExecution?: { lastStatusChange?: Date } }> }): string | undefined {
  const changes = (stage.actionStates ?? [])
    .map((actionState) => actionState.latestExecution?.lastStatusChange)
    .filter((value): value is Date => value instanceof Date);

  if (changes.length === 0) return undefined;
  const newest = changes.reduce((latest, current) =>
    current.getTime() > latest.getTime() ? current : latest
  );
  return newest.toISOString();
}

export function registerCodePipelineTools(server: McpServer) {
  server.registerTool(
    "list_pipelines",
    {
      description: "List all CodePipeline pipelines in the account.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const data = await codepipelineMethods.listPipelines();
      const pipelines = (data.pipelines ?? []).map((p) => ({
        name: p.name,
        created: toIso(p.created),
        updated: toIso(p.updated),
      }));
      return { content: [{ type: "text", text: JSON.stringify(pipelines, null, 2) }] };
    }
  );

  server.registerTool(
    "get_pipeline",
    {
      description:
        "Fetch the full structure of a CodePipeline pipeline, including all stages, actions, and configurations.",
      inputSchema: {
        pipeline_name: z.string().describe("CodePipeline pipeline name"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ pipeline_name }) => {
      const data = await codepipelineMethods.getPipeline({ pipelineName: pipeline_name });
      return { content: [{ type: "text", text: JSON.stringify(data.pipeline, null, 2) }] };
    }
  );

  server.registerTool(
    "get_pipeline_state",
    {
      description:
        "Get the current execution state for each stage in a CodePipeline pipeline.",
      inputSchema: {
        pipeline_name: z.string().describe("CodePipeline pipeline name"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ pipeline_name }) => {
      const data = await codepipelineMethods.getPipelineState({ pipelineName: pipeline_name });
      const states = (data.stageStates ?? []).map((s) => ({
        stage_name: s.stageName,
        status: s.latestExecution?.status,
        last_updated: getStageLastUpdated(s),
      }));
      return { content: [{ type: "text", text: JSON.stringify(states, null, 2) }] };
    }
  );

  server.registerTool(
    "list_pipeline_executions",
    {
      description:
        "List recent execution history for a CodePipeline pipeline.",
      inputSchema: {
        pipeline_name: z.string().describe("CodePipeline pipeline name"),
        max_results: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(10)
          .describe("Maximum number of execution summaries to return (max 100)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ pipeline_name, max_results }) => {
      const data = await codepipelineMethods.listPipelineExecutions({
        pipelineName: pipeline_name,
        maxResults: max_results,
      });
      const executions = (data.pipelineExecutionSummaries ?? []).map((e) => ({
        execution_id: e.pipelineExecutionId,
        status: e.status,
        trigger: e.trigger?.triggerType,
        started_at: toIso(e.startTime),
        updated_at: toIso(e.lastUpdateTime),
      }));
      return { content: [{ type: "text", text: JSON.stringify(executions, null, 2) }] };
    }
  );

  server.registerTool(
    "get_pipeline_execution",
    {
      description:
        "Get details of a specific CodePipeline execution, including source artifact revisions.",
      inputSchema: {
        pipeline_name: z.string().describe("CodePipeline pipeline name"),
        execution_id: z.string().describe("Pipeline execution ID"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ pipeline_name, execution_id }) => {
      const data = await codepipelineMethods.getPipelineExecution({
        pipelineName: pipeline_name,
        executionId: execution_id,
      });

      const result = {
        status: data.pipelineExecution?.status,
        artifact_revisions: (data.pipelineExecution?.artifactRevisions ?? []).map((r) => ({
          name: r.name,
          revision_id: r.revisionId,
          revision_url: r.revisionUrl,
          revision_summary: r.revisionSummary,
        })),
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "find_pipeline_for_service",
    {
      description:
        "Given an ECS service name, find the most likely CodePipeline pipeline and extract Bitbucket source details.",
      inputSchema: {
        service_name: z.string().describe("ECS service name, e.g. my-service-qa1"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ service_name }) => {
      const listed = await codepipelineMethods.listPipelines();
      const pipelineNames = (listed.pipelines ?? [])
        .map((p) => p.name)
        .filter((name): name is string => Boolean(name));

      const serviceLower = service_name.toLowerCase();
      const exactMatch = pipelineNames.find((name) => name.toLowerCase() === serviceLower);

      const baseServiceName = stripServiceEnvironmentSuffix(service_name).toLowerCase();
      const partialMatch = pipelineNames.find((name) =>
        name.toLowerCase().includes(baseServiceName)
      );

      const matchedPipeline = exactMatch ?? partialMatch;
      if (!matchedPipeline) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              found: false,
              message:
                `No CodePipeline pipeline matched ECS service "${service_name}". ` +
                "Fallback to fuzzy Bitbucket repository matching.",
            }, null, 2),
          }],
        };
      }

      const pipeline = await codepipelineMethods.getPipeline({ pipelineName: matchedPipeline });
      const sourceStage = (pipeline.pipeline?.stages ?? []).find((stage) =>
        (stage.name ?? "").toLowerCase().includes("source")
      );

      if (!sourceStage) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              found: false,
              pipeline_name: matchedPipeline,
              message:
                `Pipeline "${matchedPipeline}" has no Source stage. ` +
                "Fallback to fuzzy Bitbucket repository matching.",
            }, null, 2),
          }],
        };
      }

      const sourceAction = (sourceStage.actions ?? []).find((action) => {
        const provider = action.actionTypeId?.provider;
        return provider === "Bitbucket" || provider === "CodeStarSourceConnection";
      });

      if (!sourceAction) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              found: false,
              pipeline_name: matchedPipeline,
              message:
                `Pipeline "${matchedPipeline}" Source stage has no Bitbucket/CodeStar source action. ` +
                "Fallback to fuzzy Bitbucket repository matching.",
            }, null, 2),
          }],
        };
      }

      const config = sourceAction.configuration ?? {};
      const fullRepositoryId = config["FullRepositoryId"];
      const branchName = config["BranchName"];
      const connectionArn = config["ConnectionArn"];

      const [repoWorkspace, repoSlug] = (fullRepositoryId ?? "").split("/");

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            found: true,
            pipeline_name: matchedPipeline,
            repo_workspace: repoWorkspace || undefined,
            repo_slug: repoSlug || undefined,
            branch: branchName || undefined,
            connection_arn: connectionArn || undefined,
          }, null, 2),
        }],
      };
    }
  );
}
