import { Request, Response, NextFunction } from "express";
import Handler from ".";
import Logger from "../logger/app";
import { sessionStore } from "../session";
import { runInvestigation } from "../service/ai";
import AppError from "../error";
import { APIErrors } from "../error/const";
import APICodes from "../error/apicodes.json";

/**
 * Handles GET /api/chat/:sessionId.
 *
 * Runs a single AI turn for the given session and returns one JSON response.
 */
export default class ChatStreamHandler implements Handler {
  /**
   * @public
   * Looks up the session and delegates to the AI service.
   *
   * @param {Request} req The Express request object (`:sessionId` param required).
   * @param {Response} res The Express response object.
   * @param {NextFunction} next The next middleware function.
   */
  public handler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const sessionId = req.params["sessionId"];
    Logger.logDebug(`ChatStreamHandler: Running turn for session ${sessionId}`);

    try {
      const session = sessionId ? sessionStore.get(sessionId) : undefined;
      if (!session) {
        throw new AppError(
          `Session "${sessionId}" not found.`,
          APIErrors.APINotFoundError,
          "ChatStreamHandler.handler"
        );
      }

      const result = await runInvestigation(session);
      res.status(APICodes.success).json(result);
    } catch (err) {
      next(err);
    }
  };
}
