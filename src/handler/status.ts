import { Request, Response } from "express";
import Handler from ".";
import Logger from "../logger/app";
import { ResponseMessage } from "../models";
import { success } from "../error/messages.json";
import APICodes from "../error/apicodes.json";

/**
 * Handles a status request at an endpoint.
 */
export default class StatusHandler implements Handler {
  /**
   * @public
   * Creates a handler for a status request coming to the API.
   * @param {Request} _ The express request object.
   * @param {Response} res The express response object.
   */
  public async handler(_: Request, res: Response): Promise<void> {
    Logger.logDebug(`StatusHandler: Handling status request`);
    const response: ResponseMessage<undefined> = {
      status: APICodes.success,
      message: success.generic,
    };
    res.status(response.status).send(response);
  }
}
