import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ecsMethods } from "../methods/ecs.js";

export function registerEcsTools(server: McpServer) {
  server.registerTool(
    "ecs_list_clusters",
    {
      description:
        "List ECS cluster ARNs in the account. Use ecs_describe_clusters to get full details.",
      inputSchema: {
        max_results: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(100)
          .describe("Maximum number of cluster ARNs to return (max 100)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ max_results }) => {
      const data = await ecsMethods.listClusters({ maxResults: max_results });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "ecs_describe_clusters",
    {
      description:
        "Get full details for one or more ECS clusters, including status, registered container instances, and running task counts.",
      inputSchema: {
        clusters: z
          .array(z.string())
          .min(1)
          .describe("List of cluster names or ARNs to describe"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ clusters }) => {
      const data = await ecsMethods.describeClusters({ clusters });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "ecs_list_services",
    {
      description:
        "List ECS service ARNs in a cluster. Use ecs_describe_services to get full details.",
      inputSchema: {
        cluster: z
          .string()
          .describe("Cluster name or ARN"),
        max_results: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(100)
          .describe("Maximum number of service ARNs to return (max 100)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ cluster, max_results }) => {
      const data = await ecsMethods.listServices({ cluster, maxResults: max_results });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "ecs_describe_services",
    {
      description:
        "Get full details for one or more ECS services in a cluster, including desired/running/pending task counts, deployment status, and task definition.",
      inputSchema: {
        cluster: z
          .string()
          .describe("Cluster name or ARN"),
        services: z
          .array(z.string())
          .min(1)
          .describe("List of service names or ARNs to describe (max 10)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ cluster, services }) => {
      const data = await ecsMethods.describeServices({ cluster, services });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "ecs_list_tasks",
    {
      description:
        "List ECS task ARNs in a cluster, optionally filtered by service, family, or status.",
      inputSchema: {
        cluster: z
          .string()
          .describe("Cluster name or ARN"),
        service_name: z
          .string()
          .optional()
          .describe("Filter tasks by service name"),
        family: z
          .string()
          .optional()
          .describe("Filter tasks by task definition family name"),
        desired_status: z
          .enum(["RUNNING", "PENDING", "STOPPED"])
          .default("RUNNING")
          .describe("Filter tasks by desired status"),
        max_results: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(100)
          .describe("Maximum number of task ARNs to return (max 100)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ cluster, service_name, family, desired_status, max_results }) => {
      const data = await ecsMethods.listTasks({
        cluster,
        serviceName: service_name,
        family,
        desiredStatus: desired_status,
        maxResults: max_results,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "ecs_describe_tasks",
    {
      description:
        "Get full details for one or more ECS tasks, including container statuses, CPU/memory, network bindings, and stop reason.",
      inputSchema: {
        cluster: z
          .string()
          .describe("Cluster name or ARN"),
        tasks: z
          .array(z.string())
          .min(1)
          .describe("List of task ARNs or IDs to describe (max 100)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ cluster, tasks }) => {
      const data = await ecsMethods.describeTasks({ cluster, tasks });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "ecs_describe_task_definition",
    {
      description:
        "Get the full task definition for a given family and revision, including container definitions, CPU/memory, volumes, and IAM roles.",
      inputSchema: {
        task_definition: z
          .string()
          .describe(
            'Task definition family or family:revision, e.g. "my-app" or "my-app:3"'
          ),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ task_definition }) => {
      const data = await ecsMethods.describeTaskDefinition({ taskDefinition: task_definition });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
