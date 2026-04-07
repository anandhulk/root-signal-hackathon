import fs from "node:fs";
import path from "node:path";
import { Response } from "express";
import OpenAI from "openai";
import { Session } from "../session";
import { getMcpToolDefinitions, callMcpTool } from "../mcp/client";
import { SseEventType, ToolCallStatus } from "../models";
import Logger from "../logger/app";

const _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Loads the SRE investigator system prompt from the prompts directory.
 * The file is resolved relative to the compiled output location so it works
 * both in development (dist/src/service/) and production builds.
 */
function _loadSystemPrompt(): string {
  const promptPath = path.join(__dirname, "../prompts/sre-investigator.md");
  return fs.readFileSync(promptPath, "utf-8").trim();
}

const _SYSTEM_PROMPT = _loadSystemPrompt();

/**
 * Writes a single SSE event to the response.
 * @param {Response} res The Express response object.
 * @param {SseEventType} event The event type.
 * @param {unknown} data The event payload.
 */
function _sseWrite(res: Response, event: SseEventType, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Accumulator for a single tool call being streamed from OpenAI.
 */
interface ToolCallAccumulator {
  id: string;
  name: string;
  args: string;
}

/**
 * Streams an AI-powered root cause analysis investigation over SSE.
 *
 * The function:
 * 1. Sets SSE response headers.
 * 2. Fetches tool definitions from both MCP servers.
 * 3. Runs a multi-turn loop: streams the OpenAI response, executes any tool
 *    calls via the MCP client, and continues until the model stops calling tools.
 * 4. Emits `tool_call`, `delta`, and `done` SSE events throughout.
 *
 * All errors are caught and emitted as a `done` event so the frontend always
 * receives a clean end signal.
 *
 * @param {Session} session The investigation session containing context and message history.
 * @param {Response} res The Express response object (will be kept open for SSE).
 */
export async function streamInvestigation(session: Session, res: Response): Promise<void> {
  Logger.logDebug(`AiService: Starting investigation stream for session ${session.id}`);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const tools = await getMcpToolDefinitions();
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: _SYSTEM_PROMPT },
      ...session.messages,
    ];

    let continueLoop = true;

    while (continueLoop) {
      const stream = await _openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools,
        stream: true,
      });

      let fullContent = "";
      const toolCallMap = new Map<number, ToolCallAccumulator>();
      let finishReason = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const fr = chunk.choices[0]?.finish_reason;

        if (delta?.content) {
          fullContent += delta.content;
          _sseWrite(res, SseEventType.Delta, { text: delta.content });
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const existing = toolCallMap.get(tc.index) ?? { id: "", name: "", args: "" };
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name = tc.function.name;
            if (tc.function?.arguments) existing.args += tc.function.arguments;
            toolCallMap.set(tc.index, existing);
          }
        }

        if (fr) finishReason = fr;
      }

      if (finishReason === "tool_calls") {
        const toolCalls = Array.from(toolCallMap.values());

        // Append the assistant turn that requested the tools
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.args },
          })),
        });

        // Execute each tool and stream status events
        for (const tc of toolCalls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.args || "{}");
          } catch {
            args = {};
          }

          _sseWrite(res, SseEventType.ToolCall, {
            id: tc.id,
            name: tc.name,
            input: args,
            status: ToolCallStatus.Running,
          });

          const result = await callMcpTool(tc.name, args);

          _sseWrite(res, SseEventType.ToolCall, {
            id: tc.id,
            name: tc.name,
            status: ToolCallStatus.Done,
          });

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: result,
          });
        }
      } else {
        // finish_reason is "stop" — investigation complete
        if (fullContent) {
          session.messages.push({ role: "assistant", content: fullContent });
        }
        continueLoop = false;
      }
    }

    Logger.logDebug(`AiService: Investigation complete for session ${session.id}`);
    _sseWrite(res, SseEventType.Done, {});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Logger.logDebug(`AiService: Stream error for session ${session.id} — ${message}`);
    _sseWrite(res, SseEventType.Done, { error: message });
  } finally {
    res.end();
  }
}
