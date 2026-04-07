import winston, { createLogger, format, transports } from "winston";
import AppError from "../error";
import { LogLevels } from "../models";

const { combine, timestamp, printf } = format;

const LOG_LEVEL = process.env.LOG_LEVEL;

/**
 * Handles logging in the application
 */
export default class Logger {
  /**
   * @protected
   * Logs info messages.
   */
  protected _logger: winston.Logger;

  /**
   * @private
   * Custom format used for logging
   */
  private readonly _customFormat: winston.Logform.Format;

  /**
   * Create both info logger and error logger.
   * Also initiated the custom format.
   */
  constructor() {
    this._customFormat = printf(
      ({ level, message, timestamp: time }) => `${level}: ${time}: ${message}`,
    );
    this._logger = this.createNewLogger();
  }

  /**
   * @public
   * Logs a critical message.
   * @param {string} message Message to log.
   * @param {Error | AppError} error Error to log.
   */
  public logCritical(message: string, error: Error | AppError): void {
    this._logMessageWithLevel(
      LogLevels.critical,
      `${message}, error:${
        error instanceof AppError ? error.toString() : (error.stack ?? error)
      }`,
    );
  }

  /**
   * @public
   * Logs an error message.
   * @param {string} message Message to log.
   * @param {Error | AppError} error Error to log.
   */
  public logError(message: string, error: Error | AppError): void {
    this._logMessageWithLevel(
      LogLevels.error,
      `${message}, error:${
        error instanceof AppError ? error.toString() : (error.stack ?? error)
      }`,
    );
  }

  /**
   * @public
   * Logs an warning message.
   * @param {string} message Message to log.
   * @param {Error | AppError | undefined} error Error to log.
   */
  public logWarning(
    message: string,
    error: Error | AppError | undefined,
  ): void {
    let warningMessage = "";
    if (error)
      warningMessage = `, error:${
        error instanceof AppError ? error.toString() : (error.stack ?? error)
      }`;
    this._logMessageWithLevel(LogLevels.warning, `${message}${warningMessage}`);
  }

  /**
   * @public
   * Logs an info message.
   * @param {string} message Message to log.
   */
  public logInfo(message: string): void {
    this._logMessageWithLevel(LogLevels.info, message);
  }

  /**
   * @public
   * Logs a debug message.
   * @param {string} message Message to log.
   */
  public logDebug(message: string): void {
    this._logMessageWithLevel(LogLevels.debug, message);
  }

  /**
   * @private
   * @param {LogLevels} level The log level.
   * @param {string} message The message to log.
   */
  private _logMessageWithLevel(level: LogLevels, message: string): void {
    this._logger.log({
      level,
      message,
    });
  }

  /**
   * @private
   * Create new logger.
   * If not production, data will be logged to stdout.
   * @returns {winston.Logger} New logger.
   */
  private createNewLogger(): winston.Logger {
    const transportList = [];
    transportList.push(
      new transports.Console({
        format: combine(timestamp(), this._customFormat),
      }),
    );
    const logger = createLogger({
      format: combine(timestamp(), this._customFormat),
      transports: transportList,
      level: LOG_LEVEL ?? LogLevels.info,
      levels: {
        [LogLevels.critical]: 0,
        [LogLevels.error]: 1,
        [LogLevels.warning]: 2,
        [LogLevels.info]: 3,
        [LogLevels.debug]: 4,
      },
    });
    return logger;
  }
}
