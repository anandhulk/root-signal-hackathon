import {
  CodePipelineClient,
  ListPipelinesCommand,
  GetPipelineCommand,
  GetPipelineStateCommand,
  ListPipelineExecutionsCommand,
  GetPipelineExecutionCommand,
} from "@aws-sdk/client-codepipeline";
import { getRegion, getAwsCredentials } from "../auth.js";

function wrapError(err: unknown, context: string): never {
  const message = err instanceof Error
    ? err.message
    : typeof err === "string"
      ? err
      : JSON.stringify(err);
  throw new Error(`AWS CodePipeline error (${context}): ${message}`);
}

const codepipeline = new CodePipelineClient({
  region: getRegion(),
  credentials: getAwsCredentials(),
});

export const codepipelineMethods = {
  async listPipelines() {
    try {
      const res = await codepipeline.send(new ListPipelinesCommand({}));
      return res;
    } catch (err) {
      wrapError(err, "ListPipelines");
    }
  },

  async getPipeline(params: { pipelineName: string }) {
    try {
      const res = await codepipeline.send(
        new GetPipelineCommand({ name: params.pipelineName })
      );
      return res;
    } catch (err) {
      wrapError(err, "GetPipeline");
    }
  },

  async getPipelineState(params: { pipelineName: string }) {
    try {
      const res = await codepipeline.send(
        new GetPipelineStateCommand({ name: params.pipelineName })
      );
      return res;
    } catch (err) {
      wrapError(err, "GetPipelineState");
    }
  },

  async listPipelineExecutions(params: { pipelineName: string; maxResults?: number }) {
    try {
      const res = await codepipeline.send(
        new ListPipelineExecutionsCommand({
          pipelineName: params.pipelineName,
          ...(params.maxResults ? { maxResults: params.maxResults } : {}),
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "ListPipelineExecutions");
    }
  },

  async getPipelineExecution(params: { pipelineName: string; executionId: string }) {
    try {
      const res = await codepipeline.send(
        new GetPipelineExecutionCommand({
          pipelineName: params.pipelineName,
          pipelineExecutionId: params.executionId,
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "GetPipelineExecution");
    }
  },
};
