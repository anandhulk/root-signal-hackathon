import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { Session } from "../session";
import { getMcpToolDefinitions, callMcpTool } from "../mcp/client";
import { SseToolCallEvent, ToolCallStatus } from "../models";
import Logger from "../logger/app";

const _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Loads the SRE investigator system prompt from the prompts directory.
 * The file is resolved relative to the compiled output location so it works
 * both in development (dist/src/service/) and production builds.
 */
function _loadSystemPrompt(): string {
  const promptPath = path.join(__dirname, "../prompts/sre-investigator.md");
  return fs.readFileSync(promptPath, "utf-8").trim();
}

const _CODEPIPELINE_TRACE_INSTRUCTION =
  "When you identify an ECS service during investigation, before fetching from " +
  "Bitbucket directly, first call find_pipeline_for_service() with the ECS service " +
  "name. If it returns a repo, use those exact details (workspace, repo_slug, branch) " +
  "for all subsequent Bitbucket tool calls. Only fall back to fuzzy repo matching " +
  "if find_pipeline_for_service() returns no result.";

const _SYSTEM_PROMPT = `${_loadSystemPrompt()}\n\n${_CODEPIPELINE_TRACE_INSTRUCTION}`;

/**
 * Maximum characters allowed for a single tool result before it is truncated.
 * ~80 000 chars ≈ ~20 000 tokens, leaving headroom for the rest of the context.
 */
const MAX_TOOL_RESULT_CHARS = 80_000;

/**
 * Rough character budget for the running messages array.
 * Each char is ~0.25 tokens on average; 100 000 tokens ≈ 400 000 chars.
 * We trim old tool results once we exceed this to stay well under the model limit.
 */
const MAX_MESSAGES_CHARS = 400_000;

/** Truncates a tool result string if it exceeds MAX_TOOL_RESULT_CHARS. */
function _truncateToolResult(result: string): string {
  if (result.length <= MAX_TOOL_RESULT_CHARS) return result;
  const kept = result.slice(0, MAX_TOOL_RESULT_CHARS);
  return `${kept}\n\n[... truncated: ${result.length - MAX_TOOL_RESULT_CHARS} chars omitted to fit context ...]`;
}

/**
 * Removes the oldest tool-result/tool-use message pairs from the history when
 * the total serialized size exceeds MAX_MESSAGES_CHARS. Always keeps the first
 * user message so the AI retains the original investigation goal.
 */
function _trimMessages(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  const totalChars = messages.reduce((sum, m) => sum + JSON.stringify(m).length, 0);
  if (totalChars <= MAX_MESSAGES_CHARS) return messages;

  const trimmed = [...messages];
  let i = 0;
  while (i < trimmed.length && JSON.stringify(trimmed).length > MAX_MESSAGES_CHARS) {
    const msg = trimmed[i];
    // Drop user messages that are purely tool results (not the initial prompt string)
    if (
      msg?.role === "user" &&
      Array.isArray(msg.content) &&
      msg.content.length > 0 &&
      (msg.content as Anthropic.ToolResultBlockParam[])[0]?.type === "tool_result"
    ) {
      // Also remove the preceding assistant message that requested these tools
      if (i > 0 && trimmed[i - 1]?.role === "assistant") {
        trimmed.splice(i - 1, 2);
        i = Math.max(0, i - 1);
      } else {
        trimmed.splice(i, 1);
      }
    } else {
      i++;
    }
  }
  return trimmed;
}

/** Removes hidden/internal thinking content if the model emits it. */
function _stripThinkingText(text: string): string {
  return text
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/```(?:thinking|thought|reasoning)[\s\S]*?```/gi, "")
    .trim();
}

/**
 * Runs an AI-powered root cause analysis investigation.
 *
 * The function:
 * 1. Fetches tool definitions from both MCP servers.
 * 2. Runs a multi-turn loop: executes model turns and MCP tool calls until the
 *    model stops calling tools.
 * 3. Returns a single final response and collected tool-call statuses.
 *
 * Any "thinking" content emitted by the model is stripped from the final text.
 *
 * @param {Session} session The investigation session containing context and message history.
 * @returns {Promise<{response: string; toolCalls: SseToolCallEvent[]}>}
 * The final assistant response and tool statuses for the turn.
 */
export async function runInvestigation(
  session: Session
): Promise<{ response: string; toolCalls: SseToolCallEvent[] }> {
  Logger.logDebug(`AiService: Starting investigation for session ${session.id}`);
  const toolCalls: SseToolCallEvent[] = [];
  const tools = await getMcpToolDefinitions();
  const messages: Anthropic.MessageParam[] = [...session.messages];

  let response = "";
  let continueLoop = true;

  while (continueLoop) {
    const finalMessage = await _anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8096,
      system: _SYSTEM_PROMPT,
      tools,
      messages,
    });

    if (finalMessage.stop_reason === "tool_use") {
      // Append the full assistant turn (includes text + tool_use blocks)
      messages.push({ role: "assistant", content: finalMessage.content });

      const toolUseBlocks = finalMessage.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const toolCallEvent: SseToolCallEvent = {
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input as Record<string, unknown>,
          status: ToolCallStatus.Running,
        };

        const { result, error } = await callMcpTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );

        if (error) {
          Logger.logCritical(
            `AiService: Tool "${toolUse.name}" failed in session ${session.id} — ${error}`,
            new Error(error)
          );
          toolCallEvent.status = ToolCallStatus.Error;
          toolCallEvent.error = error;
        } else {
          toolCallEvent.status = ToolCallStatus.Done;
        }
        toolCalls.push(toolCallEvent);

        // Always pass the result back so the model can reason about failures too.
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: _truncateToolResult(result),
        });
      }

      // All tool results go in a single user message
      messages.push({ role: "user", content: toolResults });

      const trimmed = _trimMessages(messages);
      messages.splice(0, messages.length, ...trimmed);
    } else {
      // stop_reason is "end_turn" — investigation complete
      const textContent = finalMessage.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      response = _stripThinkingText(textContent);
      if (response) {
        session.messages.push({ role: "assistant", content: response });
      }
      continueLoop = false;
    }
  }

  Logger.logDebug(`AiService: Investigation complete for session ${session.id}`);
  return { response, toolCalls };
}
