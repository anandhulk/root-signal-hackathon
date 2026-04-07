import { Request, Response, NextFunction } from "express";
import Handler from ".";
import Logger from "../logger/app";
import { sessionStore } from "../session";
import { InvestigationRequest, InvestigationMode, Environment, AwsRegion } from "../models";
import AppError from "../error";
import { APIErrors } from "../error/const";
import APICodes from "../error/apicodes.json";

/**
 * Handles POST /api/investigate.
 *
 * Validates the request body, creates a new investigation session,
 * and returns the session ID so the client can open the SSE stream.
 */
export default class InvestigateHandler implements Handler {
  /**
   * @public
   * Creates a new investigation session from the request body.
   *
   * Expected body: `{ mode, service?, prompt, filters: { timeRange, environment, region }, sources[] }`
   *
   * @param {Request} req The Express request object.
   * @param {Response} res The Express response object.
   * @param {NextFunction} next The next middleware function.
   */
  public handler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    Logger.logDebug("InvestigateHandler: Received investigation request");
    try {
      const { mode, service, prompt, filters, sources } = req.body as InvestigationRequest;

      if (!mode || !Object.values(InvestigationMode).includes(mode)) {
        throw new AppError(
          `Invalid mode "${mode}". Must be "auto" or "manual".`,
          APIErrors.APIBadInputError,
          "InvestigateHandler.handler"
        );
      }

      if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        throw new AppError(
          "prompt is required and must be a non-empty string.",
          APIErrors.APIBadInputError,
          "InvestigateHandler.handler"
        );
      }

      if (!filters || !filters.timeRange || !filters.environment || !filters.region) {
        throw new AppError(
          "filters.timeRange, filters.environment, and filters.region are all required.",
          APIErrors.APIBadInputError,
          "InvestigateHandler.handler"
        );
      }

      if (!Object.values(Environment).includes(filters.environment)) {
        throw new AppError(
          `Invalid environment "${filters.environment}". Must be one of: ${Object.values(Environment).join(", ")}.`,
          APIErrors.APIBadInputError,
          "InvestigateHandler.handler"
        );
      }

      if (!Object.values(AwsRegion).includes(filters.region)) {
        throw new AppError(
          `Invalid region "${filters.region}". Must be one of: ${Object.values(AwsRegion).join(", ")}.`,
          APIErrors.APIBadInputError,
          "InvestigateHandler.handler"
        );
      }

      const context: InvestigationRequest = {
        mode,
        service,
        prompt: prompt.trim(),
        filters,
        sources: Array.isArray(sources) ? sources : [],
      };

      const session = sessionStore.create(context);
      Logger.logDebug(`InvestigateHandler: Created session ${session.id}`);

      res.status(APICodes.success).json({ sessionId: session.id });
    } catch (err) {
      next(err);
    }
  };
}
