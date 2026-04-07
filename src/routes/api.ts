import { Router } from "express";
import InvestigateHandler from "../handler/investigate";
import ChatStreamHandler from "../handler/chat-stream";
import ChatMessageHandler from "../handler/chat-message";
import Logger from "../logger/app";
import {
  ROUTE_INVESTIGATE_PREFIX,
  ROUTE_CHAT_PREFIX,
} from "../config/const";

/**
 * Registers all investigation and chat API routes.
 *
 * Routes registered (relative to the `/api` mount point):
 * - POST `/investigate`          → start a new investigation session
 * - GET  `/chat/:sessionId`      → SSE stream for AI investigation
 * - POST `/chat/:sessionId/message` → append a follow-up message
 */
export default class ApiRouteManager {
  /**
   * @protected
   * Router instance for this route group.
   */
  protected _router: Router;

  /**
   * Initialises the router and registers all routes.
   */
  constructor() {
    this._router = Router();
    this._registerRoutes();
  }

  /**
   * @public
   * Returns the configured router.
   * @returns {Router} The router with all investigation routes registered.
   */
  public getRouter(): Router {
    return this._router;
  }

  /**
   * @private
   * Registers investigation and chat routes.
   */
  private _registerRoutes(): void {
    Logger.logDebug("ApiRouteManager: Registering investigation and chat routes");

    this._router.post(
      ROUTE_INVESTIGATE_PREFIX,
      new InvestigateHandler().handler
    );

    this._router.get(
      `${ROUTE_CHAT_PREFIX}/:sessionId`,
      new ChatStreamHandler().handler
    );

    this._router.post(
      `${ROUTE_CHAT_PREFIX}/:sessionId/message`,
      new ChatMessageHandler().handler
    );
  }
}
