import { ErrorCode } from "./const";

/**
 * Handles error class.
 */
export default class AppError extends Error {
  /**
   * @private
   * Stores the error code.
   */
  private _code: ErrorCode;

  /**
   * @private
   * Stores the original error if any.
   */
  private _error?: Error;

  /**
   * @private
   * Stores the original message if any.
   */
  private _message?: string;

  /**
   * @private
   * Reporter function of the error.
   */
  private _reporterFunction?: string;

  /**
   * Initalize the error.
   * @param {Error|string} error The original error object or the error message.
   * @param {ErrorCode} code The App wide code for the error.
   * @param {string} reporter The reporter function for the error.
   */
  constructor(error: Error | string, code: ErrorCode, reporter?: string) {
    super();
    if (typeof error === "string") this._message = error;
    else this._error = error;
    this._code = code;
    this._reporterFunction = reporter;
  }

  /**
   * @public
   * Get a printable version of the error.
   * @returns {string} The stringified value of error.
   */
  public toString(): string {
    return `AppError:
    ${
      this._error
        ? `Error occurred in: ${this._error.stack}`
        : `Error message: ${this._message}`
    },${
      this._reporterFunction
        ? `Reported by function: ${this._reporterFunction},`
        : ""
    }
    Error code: ${this._code}`;
  }

  /**
   * @public
   * Get code of the error.
   * @returns {ErrorCode} The code of error.
   */
  public getCode(): ErrorCode {
    return this._code;
  }

  /**
   * @public
   * Get message of the error.
   * @returns {string} The message of error.
   */
  public getMessage(): string {
    let message = "";
    if (this._message) message = this._message;
    else if (this._error) message = this._error.message;
    return message;
  }
}
