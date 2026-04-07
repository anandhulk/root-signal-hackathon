import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import OpenAI from "openai";
import { createServer as createAwsServer } from "../../mcp/aws/server";
import { createServer as createBitbucketServer } from "../../mcp/bitbucket/server";
import Logger from "../logger/app";

/** Lazy-initialised AWS MCP client. */
let _awsClient: Client | null = null;
/** Lazy-initialised Bitbucket MCP client. */
let _bitbucketClient: Client | null = null;
/** Maps each tool name to the client that owns it (built on first init). */
const _toolRouteMap = new Map<string, Client>();
/** Cached OpenAI-format tool definitions. */
let _cachedToolDefinitions: OpenAI.ChatCompletionTool[] | null = null;

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
export async function getMcpToolDefinitions(): Promise<OpenAI.ChatCompletionTool[]> {
  if (_cachedToolDefinitions) return _cachedToolDefinitions;

  Logger.logDebug("McpClient: Fetching tool definitions from MCP servers");
  const [awsClient, bbClient] = await Promise.all([_getAwsClient(), _getBitbucketClient()]);
  const [awsResult, bbResult] = await Promise.all([
    awsClient.listTools(),
    bbClient.listTools(),
  ]);

  // Build routing map and convert to OpenAI format in a single pass
  const definitions: OpenAI.ChatCompletionTool[] = [];

  for (const tool of awsResult.tools) {
    _toolRouteMap.set(tool.name, awsClient);
    definitions.push({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description ?? "",
        parameters: tool.inputSchema as Record<string, unknown>,
      },
    });
  }

  for (const tool of bbResult.tools) {
    _toolRouteMap.set(tool.name, bbClient);
    definitions.push({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description ?? "",
        parameters: tool.inputSchema as Record<string, unknown>,
      },
    });
  }

  _cachedToolDefinitions = definitions;
  Logger.logDebug(`McpClient: Loaded ${definitions.length} tools`);
  return definitions;
}

/**
 * Executes an MCP tool by name, routing to the correct server.
 * Returns tool output as a string. Errors are caught and returned
 * as a string so the AI can reason about the failure.
 * @param {string} name The tool name.
 * @param {Record<string, unknown>} args The tool arguments.
 * @returns {Promise<string>} The tool result or error description.
 */
export async function callMcpTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  Logger.logDebug(`McpClient: Calling tool "${name}"`);
  try {
    // Ensure routing map is initialised
    if (_toolRouteMap.size === 0) {
      await getMcpToolDefinitions();
    }

    const client = _toolRouteMap.get(name);
    if (!client) {
      return `Tool "${name}" not found in any connected MCP server.`;
    }

    const result = await client.callTool({ name, arguments: args });
    const textContent = (result.content as Array<{ type: string; text?: string }>)
      .filter((c) => c.type === "text" && c.text !== undefined)
      .map((c) => c.text!)
      .join("\n");

    Logger.logDebug(`McpClient: Tool "${name}" completed`);
    return textContent || "(no output)";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.logDebug(`McpClient: Tool "${name}" failed — ${message}`);
    return `Tool error: ${message}`;
  }
}
