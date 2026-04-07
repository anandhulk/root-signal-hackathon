import { Request, Response, NextFunction } from "express";
import Middleware from "./middleware";
import Logger from "../logger/app";

/**
 * Handles setting custom headers for requests.
 */
export default class SetHeaders implements Middleware {
  /**
   * @public
   * Set custom headers for the request.
   * @param {Request} req The express request object.
   * @param {Response} res The express response object.
   * @param {NextFunction} next The express next function.
   */
  public handler(req: Request, res: Response, next: NextFunction): void {
    Logger.logDebug(
      `SetHeaders: Setting custom headers for request: ${req.url}`
    );
    // Prevents browsers from guessing the content type, helping to avoid security vulnerabilities
    res.setHeader("X-Content-Type-Options", "nosniff");
    return next();
  }
}
