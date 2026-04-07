import { Request, Response, NextFunction } from "express";
import Handler from ".";
import Logger from "../logger/app";
import { sessionStore } from "../session";
import AppError from "../error";
import { APIErrors } from "../error/const";
import APICodes from "../error/apicodes.json";

/**
 * Handles POST /api/chat/:sessionId/message.
 *
 * Appends a follow-up user message to an existing investigation session.
 * After this call the client should request the next AI turn from
 * GET /api/chat/:sessionId.
 */
export default class ChatMessageHandler implements Handler {
  /**
   * @public
   * Appends the `content` from the request body to the session's message history.
   *
   * Expected body: `{ content: string }`
   *
   * @param {Request} req The Express request object (`:sessionId` param required).
   * @param {Response} res The Express response object.
   * @param {NextFunction} next The next middleware function.
   */
  public handler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const sessionId = req.params["sessionId"];
    Logger.logDebug(`ChatMessageHandler: Appending message to session ${sessionId}`);

    try {
      const session = sessionId ? sessionStore.get(sessionId) : undefined;
      if (!session) {
        throw new AppError(
          `Session "${sessionId}" not found.`,
          APIErrors.APINotFoundError,
          "ChatMessageHandler.handler"
        );
      }

      const { content } = req.body as { content: string };
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        throw new AppError(
          "content is required and must be a non-empty string.",
          APIErrors.APIBadInputError,
          "ChatMessageHandler.handler"
        );
      }

      sessionStore.appendUserMessage(sessionId!, content.trim());
      Logger.logDebug(`ChatMessageHandler: Message appended to session ${sessionId}`);

      res.status(APICodes.success).json({ ok: true });
    } catch (err) {
      next(err);
    }
  };
}
