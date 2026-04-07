import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import Anthropic from "@anthropic-ai/sdk";
import { createServer as createAwsServer } from "../../mcp/aws/server";
import { createServer as createBitbucketServer } from "../../mcp/bitbucket/server";
import Logger from "../logger/app";

/** Lazy-initialised AWS MCP client. */
let _awsClient: Client | null = null;
/** Lazy-initialised Bitbucket MCP client. */
let _bitbucketClient: Client | null = null;
/** Maps each tool name to the client that owns it (built on first init). */
const _toolRouteMap = new Map<string, Client>();
/** Cached Anthropic-format tool definitions. */
let _cachedToolDefinitions: Anthropic.Tool[] | null = null;

/**
 * Initialises and returns the AWS MCP client, connected in-process.
 * The AWS MCP server hosts all CloudWatch and ECS tools.
 * @returns {Promise<Client>} The connected AWS MCP client.
 */
async function _getAwsClient(): Promise<Client> {
  if (_awsClient) return _awsClient;

  Logger.logDebug("McpClient: Initialising in-process AWS MCP client");
  const server = createAwsServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  _awsClient = new Client({ name: "root-signal-aws", version: "1.0.0" });
  await _awsClient.connect(clientTransport);
  Logger.logDebug("McpClient: AWS MCP client ready");
  return _awsClient;
}

/**
 * Initialises and returns the Bitbucket MCP client, connected in-process.
 * The Bitbucket MCP server hosts all repository, branch, commit, PR, and file tools.
 * @returns {Promise<Client>} The connected Bitbucket MCP client.
 */
async function _getBitbucketClient(): Promise<Client> {
  if (_bitbucketClient) return _bitbucketClient;

  Logger.logDebug("McpClient: Initialising in-process Bitbucket MCP client");
  const server = createBitbucketServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  _bitbucketClient = new Client({ name: "root-signal-bitbucket", version: "1.0.0" });
  await _bitbucketClient.connect(clientTransport);
  Logger.logDebug("McpClient: Bitbucket MCP client ready");
  return _bitbucketClient;
}

/**
 * Returns all MCP tool definitions in OpenAI function-calling format.
 * Results are cached after the first call.
 * The MCP SDK serialises the registered Zod schemas to JSON Schema automatically,
 * so no manual schema writing is required.
 * @returns {Promise<OpenAI.ChatCompletionTool[]>} The combined tool list.
 */
export async function getMcpToolDefinitions(): Promise<Anthropic.Tool[]> {
  if (_cachedToolDefinitions) return _cachedToolDefinitions;

  Logger.logDebug("McpClient: Fetching tool definitions from MCP servers");
  const [awsClient, bbClient] = await Promise.all([_getAwsClient(), _getBitbucketClient()]);
  const [awsResult, bbResult] = await Promise.all([
    awsClient.listTools(),
    bbClient.listTools(),
  ]);

  // Build routing map and convert to Anthropic format in a single pass
  const definitions: Anthropic.Tool[] = [];

  for (const tool of awsResult.tools) {
    _toolRouteMap.set(tool.name, awsClient);
    definitions.push({
      name: tool.name,
      description: tool.description ?? "",
      input_schema: tool.inputSchema as Anthropic.Tool["input_schema"],
    });
  }

  for (const tool of bbResult.tools) {
    _toolRouteMap.set(tool.name, bbClient);
    definitions.push({
      name: tool.name,
      description: tool.description ?? "",
      input_schema: tool.inputSchema as Anthropic.Tool["input_schema"],
    });
  }

  _cachedToolDefinitions = definitions;
  Logger.logDebug(`McpClient: Loaded ${definitions.length} tools`);
  return definitions;
}

/**
 * Result of an MCP tool execution.
 */
export interface McpToolResult {
  /**
   * The tool output as a string, always present.
   * Passed to the AI as the tool message so it can reason about failures too.
   */
  result: string;
  /**
   * Set when the tool call failed. Contains the human-readable error message.
   * Used by the AI service to emit the correct SSE status event.
   */
  error?: string;
}

/**
 * Executes an MCP tool by name, routing to the correct server.
 * Always resolves (never rejects) so the AI can reason about failures.
 * On success, `error` is undefined. On failure, `error` carries the message
 * and `result` contains a descriptive string for the AI.
 * @param {string} name The tool name.
 * @param {Record<string, unknown>} args The tool arguments.
 * @returns {Promise<McpToolResult>} The tool result and optional error.
 */
export async function callMcpTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  Logger.logDebug(`McpClient: Calling tool "${name}"`);
  try {
    // Ensure routing map is initialised
    if (_toolRouteMap.size === 0) {
      await getMcpToolDefinitions();
    }

    const client = _toolRouteMap.get(name);
    if (!client) {
      const error = `Tool "${name}" not found in any connected MCP server.`;
      Logger.logDebug(`McpClient: ${error}`);
      return { result: error, error };
    }

    const raw = await client.callTool({ name, arguments: args });
    const textContent = (raw.content as Array<{ type: string; text?: string }>)
      .filter((c) => c.type === "text" && c.text !== undefined)
      .map((c) => c.text!)
      .join("\n");

    Logger.logDebug(`McpClient: Tool "${name}" completed`);
    return { result: textContent || "(no output)" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.logDebug(`McpClient: Tool "${name}" failed — ${message}`);
    return { result: `Tool error: ${message}`, error: message };
  }
}
