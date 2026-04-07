import { Request, Response, NextFunction } from "express";

/**
 * Handles a request at an endpoint.
 */
export default interface Handler {
  /**
   * @public
   * Creates a handler for a request coming to the API.
   * @param {Request} req The express request object.
   * @param {Response} res The express response object.
   * @param {NextFunction} next The next function to call.
   */
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
