import { Request, Response, NextFunction } from "express";

/**
 * Handles middleware implementation.
 */
export default interface Middleware {
  /**
   * @public
   * The action of the middleware.
   * @param {Request} req The express request object.
   * @param {Response} res The express response object.
   * @param {NextFunction} next The express next function.
   */
  handler: (req: Request, res: Response, next: NextFunction) => void;
}
