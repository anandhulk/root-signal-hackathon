import { Request, Response, NextFunction } from "express";
import Handler from ".";
import Logger from "../logger/app";
import { sessionStore } from "../session";
import { streamInvestigation } from "../service/ai";
import AppError from "../error";
import { APIErrors } from "../error/const";

/**
 * Handles GET /api/chat/:sessionId.
 *
 * Opens a Server-Sent Events stream for the given session. The AI service
 * calls MCP tools autonomously and streams `tool_call`, `delta`, and `done`
 * events back to the client.
 */
export default class ChatStreamHandler implements Handler {
  /**
   * @public
   * Looks up the session and delegates to the AI streaming service.
   *
   * @param {Request} req The Express request object (`:sessionId` param required).
   * @param {Response} res The Express response object (kept open for SSE).
   * @param {NextFunction} next The next middleware function.
   */
  public handler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const sessionId = req.params["sessionId"];
    Logger.logDebug(`ChatStreamHandler: Opening SSE stream for session ${sessionId}`);

    try {
      const session = sessionId ? sessionStore.get(sessionId) : undefined;
      if (!session) {
        throw new AppError(
          `Session "${sessionId}" not found.`,
          APIErrors.APINotFoundError,
          "ChatStreamHandler.handler"
        );
      }

      await streamInvestigation(session, res);
    } catch (err) {
      // If headers have already been sent (SSE started), we can't use next(err).
      // streamInvestigation handles its own errors internally; this only catches
      // pre-stream errors such as a missing session.
      if (!res.headersSent) {
        next(err);
      }
    }
  };
}
