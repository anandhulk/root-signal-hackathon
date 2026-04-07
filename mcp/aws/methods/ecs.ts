import {
  ECSClient,
  ListClustersCommand,
  DescribeClustersCommand,
  ListServicesCommand,
  DescribeServicesCommand,
  ListTasksCommand,
  DescribeTasksCommand,
  DescribeTaskDefinitionCommand,
  DesiredStatus,
} from "@aws-sdk/client-ecs";
import { getRegion, getAwsCredentials } from "../auth.js";

function wrapError(err: unknown, context: string): never {
  const message = err instanceof Error ? err.message : String(err);
  throw new Error(`AWS ECS error (${context}): ${message}`);
}

const ecs = new ECSClient({
  region: getRegion(),
  credentials: getAwsCredentials(),
});

export const ecsMethods = {
  async listClusters(params: { maxResults?: number }) {
    try {
      const res = await ecs.send(
        new ListClustersCommand({
          ...(params.maxResults ? { maxResults: params.maxResults } : {}),
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "ListClusters");
    }
  },

  async describeClusters(params: { clusters: string[] }) {
    try {
      const res = await ecs.send(
        new DescribeClustersCommand({ clusters: params.clusters })
      );
      return res;
    } catch (err) {
      wrapError(err, "DescribeClusters");
    }
  },

  async listServices(params: { cluster: string; maxResults?: number }) {
    try {
      const res = await ecs.send(
        new ListServicesCommand({
          cluster: params.cluster,
          ...(params.maxResults ? { maxResults: params.maxResults } : {}),
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "ListServices");
    }
  },

  async describeServices(params: { cluster: string; services: string[] }) {
    try {
      const res = await ecs.send(
        new DescribeServicesCommand({
          cluster: params.cluster,
          services: params.services,
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "DescribeServices");
    }
  },

  async listTasks(params: {
    cluster: string;
    serviceName?: string;
    family?: string;
    desiredStatus?: DesiredStatus;
    maxResults?: number;
  }) {
    try {
      const res = await ecs.send(
        new ListTasksCommand({
          cluster: params.cluster,
          ...(params.serviceName ? { serviceName: params.serviceName } : {}),
          ...(params.family ? { family: params.family } : {}),
          ...(params.desiredStatus ? { desiredStatus: params.desiredStatus } : {}),
          ...(params.maxResults ? { maxResults: params.maxResults } : {}),
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "ListTasks");
    }
  },

  async describeTasks(params: { cluster: string; tasks: string[] }) {
    try {
      const res = await ecs.send(
        new DescribeTasksCommand({
          cluster: params.cluster,
          tasks: params.tasks,
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "DescribeTasks");
    }
  },

  async describeTaskDefinition(params: { taskDefinition: string }) {
    try {
      const res = await ecs.send(
        new DescribeTaskDefinitionCommand({
          taskDefinition: params.taskDefinition,
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "DescribeTaskDefinition");
    }
  },
};
