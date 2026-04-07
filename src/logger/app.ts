import Logger from ".";

/**
 * Handles common logging in the application.
 */
class AppLogger extends Logger {
  /**
   * @private
   * Stores reference to singleton object.
   */
  private static _loggerInstance: AppLogger;

  /**
   * @public
   * @static
   * Get the logger instance.
   * @returns {AppLogger} The singleton instance object.
   */
  public static get Instance(): AppLogger {
    return this._loggerInstance || (this._loggerInstance = new this());
  }

  /**
   * @private
   * Create both info logger and error logger.
   */
  private constructor() {
    super();
  }
}

// Export an instance of the app logger
const loggerInstance = AppLogger.Instance;
export default loggerInstance;
