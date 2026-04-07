import Server from "./server";
import SlackNotify from "./slack";
import Logger from "./logger/app";
import { NODE_EXIT_SIGNAL } from "./config/const";

/**
 * Starting point for Root Signal API.
 */
export default class App {
  /**
   * @public
   * Tasks performed in init operation:
   * - Test connection with the database.
   * - Setting up the exit listeners for the app.
   * - Initialize API server and start the same.
   *
   * In case of an error, the process will exit with status 1.
   */
  public async init(): Promise<void> {
    try {
      Logger.logDebug(`App: Setting up the exit listeners`);
      process.on(NODE_EXIT_SIGNAL, () =>
        this._cleanUpAfterClose()
      );
      Logger.logDebug(`App: Starting API server`);
      const server = new Server();
      server.startServer();
      this._listenForUncaughtException();
    } catch (error) {
      Logger.logCritical(`App: Error in function::init`, error as Error);
      this._exitProcess(1);
    }
  }

  /**
   * @private
   * Cleanup on process exit.
   * @param {Database[]} databasesToClose The databases used in app.
   */
  private _cleanUpAfterClose(
  ): void {
    Logger.logDebug(`App: Cleaning up before application exit`);
    this._exitProcess(0);
  }

  /**
   * @private
   * Catch any uncaught exception.
   */
  private _listenForUncaughtException(): void {
    process.on("uncaughtException", (error) => {
      Logger.logCritical(
        `App: Error in function::_listenForUncaughtException`,
        error
      );
      SlackNotify.sendToWebhook(`Uncaught exception`, 500, error.message);
    });
  }

  /**
   * @private
   * Exit the process.
   * @param {number} status The status to exit the process with.
   */
  private _exitProcess(status: number): never {
    Logger.logInfo(`App: Exiting application`);
    process.exit(status);
  }
}
