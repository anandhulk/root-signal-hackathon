// node config
export const NODE_EXIT_SIGNAL = "SIGINT";

// HTTP server config (milliseconds)
export const SERVER_KEEP_ALIVE_TIMEOUT = 65_000;
export const SERVER_HEADERS_TIMEOUT = SERVER_KEEP_ALIVE_TIMEOUT + 1000;

// server API routes config
export const SERVER_API_ROUTE_V1_PREFIX = "/api/v1/";
export const SERVER_DOCS_ROUTE_PREFIX = "/docs";
export const ROUTE_HEALTH_CHECK_PREFIX = "/status";

// investigation API routes
export const SERVER_API_ROUTE_PREFIX = "/api";
export const ROUTE_INVESTIGATE_PREFIX = "/investigate";
export const ROUTE_CHAT_PREFIX = "/chat";

// SSE config
export const SSE_HEARTBEAT_INTERVAL_MS = 15_000;
