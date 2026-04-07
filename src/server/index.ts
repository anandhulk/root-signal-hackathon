import express from "express";
import cors from "cors";
import AccessLogger from "../middleware/access-logger";
import SetHeaders from "../middleware/set-headers";
import ErrorLogger from "../middleware/error-handler";
import RouteManager from "../routes";
import ApiRouteManager from "../routes/api";
import Logger from "../logger/app";
import {
  SERVER_API_ROUTE_V1_PREFIX,
  SERVER_API_ROUTE_PREFIX,
  SERVER_KEEP_ALIVE_TIMEOUT,
  SERVER_HEADERS_TIMEOUT,
} from "../config/const";

const SERVER_PORT = process.env.SERVER_PORT!;
const FRONTEND_URL = process.env.FRONTEND_URL!;

/**
 * Handles express server in the application.
 */
export default class Server {
  /**
   * @private
   * The app server used to serve http request.
   */
  private readonly _app: express.Express;

  /**
   * Initialize the server.
   */
  constructor() {
    this._app = express();
    this._registerMiddlewares();
  }

  /**
   * @public
   * Start the server in the desired port.
   */
  public startServer(): void {
    Logger.logInfo(`Server: Starting server on port: ${SERVER_PORT}`);
    const server = this._app.listen(Number.parseInt(SERVER_PORT));
    server.keepAliveTimeout = SERVER_KEEP_ALIVE_TIMEOUT;
    server.headersTimeout = SERVER_HEADERS_TIMEOUT;
  }

  /**
   * @private
   * Register the middlewares used in the API.
   * @param {Database} database The database to use in app.
   */
  private _registerMiddlewares(): void {
    Logger.logDebug(`Server: Registering cors middleware for server`);
    this._app.use(
      cors({
        origin: FRONTEND_URL,
        methods: ["GET", "POST"],
      }),
    );
    Logger.logDebug(`Server: Registering body parser middlewares for server`);
    this._app.use(express.json());
    Logger.logDebug(`Server: Registering access logger middleware for server`);
    const accessLogger = new AccessLogger().handler;
    this._app.use(accessLogger);
    Logger.logDebug(`Server: Registering set headers middleware for server`);
    const setHeaders = new SetHeaders().handler;
    this._app.use(setHeaders);
    Logger.logDebug(
      `Server: Registering API routes for prefix: ${SERVER_API_ROUTE_V1_PREFIX} in server`,
    );
    const routeManager = new RouteManager();
    this._app.use(SERVER_API_ROUTE_V1_PREFIX, routeManager.getRouter());
    Logger.logDebug(
      `Server: Registering investigation API routes for prefix: ${SERVER_API_ROUTE_PREFIX} in server`,
    );
    const apiRouteManager = new ApiRouteManager();
    this._app.use(SERVER_API_ROUTE_PREFIX, apiRouteManager.getRouter());
    Logger.logDebug(`Server: Registering error logger middleware for server`);
    const errorLogger = new ErrorLogger().handler;
    this._app.use(errorLogger);
  }
}
