import { NextFunction, Request, Response } from "express";
import AppError from "../error";
import Logger from "../logger/app";
import SlackNotify from "../slack";
import { ResponseMessage } from "../models";
import { errors } from "../error/messages.json";
import { ErrorCodes } from "../error/const";
import APICodes from "../error/apicodes.json";

/**
 * Handles logging of errors and returning response.
 */
export default class ErrorLogger {
  /**
   * @public
   * Log the error details and return the error response to user.
   * This will check the type of error and return response accordingly.
   * @param {Error} error The error occurred while handling the request.
   * @param {Request} req The express request object.
   * @param {Response} res The express response object.
   * @param {NextFunction} _ The express next function.
   */
  public handler(
    error: Error,
    req: Request,
    res: Response,
    _: NextFunction
  ): void {
    Logger.logCritical(
      `ErrorLogger: Error in function::handler, Error while calling API: ${req.url}`,
      error
    );
    const response: ResponseMessage<undefined> = {
      message: errors.generic.serverError,
      status: APICodes.serverError,
    };
    let originalError = error.message;
    if (error instanceof AppError) {
      originalError = error.getMessage();
      switch (error.getCode()) {
        case ErrorCodes.APIBadInputError:
          response.message = error.getMessage() || errors.generic.badInput;
          response.status = APICodes.badInput;
          break;
        case ErrorCodes.APIUnauthorizedError:
          response.message = errors.generic.unauthorized;
          response.status = APICodes.unauthorized;
          break;
        case ErrorCodes.APINotFoundError:
          response.message = errors.generic.notFound;
          response.status = APICodes.notFound;
          break;
        case ErrorCodes.APINotAllowedError:
          response.message = errors.generic.notAllowed;
          response.status = APICodes.notAllowed;
          break;
        case ErrorCodes.APIAlreadyExistsError:
          response.message = errors.generic.alreadyExists;
          response.status = APICodes.alreadyExists;
          break;
        case ErrorCodes.APIUnprocessableError:
          response.message = errors.generic.unprocessable;
          response.status = APICodes.unprocessable;
          break;
        default:
          break;
      }
    }
    SlackNotify.sendToWebhook(
      `Encountered ${response.message} at ${req.url}`,
      response.status,
      originalError
    );
    res.status(response.status).send(response);
  }
}
