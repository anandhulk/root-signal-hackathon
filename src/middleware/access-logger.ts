import { Request, Response, NextFunction } from "express";
import Middleware from "./middleware";
import Logger from "../logger/app";

/**
 * Handles logging of requests.
 */
export default class AccessLogger implements Middleware {
  /**
   * @public
   * Log the request details.
   * @param {Request} req The express request object.
   * @param {Response} _ The express response object.
   * @param {NextFunction} next The express next function.
   */
  public handler(req: Request, _: Response, next: NextFunction): void {
    Logger.logInfo(
      `AccessLogger: API request: ${req.url}, method:${req.method}, ip: ${req.headers["x-real-ip"]}`
    );
    next();
  }
}
