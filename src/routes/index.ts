import { Router } from "express";
import StatusHandler from "../handler/status";
import Logger from "../logger/app";
import {
  ROUTE_HEALTH_CHECK_PREFIX,
} from "../config/const";

/**
 * Handles registering routes in the server.
 */
export default class RouteManager {
  /**
   * @protected
   * Router instance to use for the group.
   */
  protected _router: Router;

  /**
   * Initializes the router.
   */
  constructor() {
    this._router = Router();
    this.registerRoutes();
  }

  /**
   * @public
   * Get the router.
   * @returns {Router} The router with the registered routes.
   */
  public getRouter(): Router {
    return this._router;
  }

  /**
   * @public
   * Initializes routes used in app.
   * To add a new route, It must be added here.
   */
  protected registerRoutes(): void {
    Logger.logDebug(
      `RouteManager: Registering ${ROUTE_HEALTH_CHECK_PREFIX} routes used in the app`
    );
    this._router.get(ROUTE_HEALTH_CHECK_PREFIX, new StatusHandler().handler);
  }
}
