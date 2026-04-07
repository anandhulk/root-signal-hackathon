/**
 * The log levels for the application.
 */
export enum LogLevels {
  /**
   * The critical log level.
   */
  critical = "Critical",
  /**
   * The error log level.
   */
  error = "Error",
  /**
   * The warning log level.
   */
  warning = "Warning",
  /**
   * The info log level.
   */
  info = "Info",
  /**
   * The debug log level.
   */
  debug = "Debug",
}

/**
 * Database identifiers.
 */
export enum DatabaseIdentifier {
  /**
   * Local database connector.
   */
  local = "local",
}

/**
 * The response structure for error/success from API.
 */
export type ResponseStructure = {
  /**
   * The status message for the requested operation.
   */
  message: string;
  /**
   * The status code for the requested operation.
   */
  status: number;
};

/**
 * The response message from API.
 */
export type ResponseMessage<T> = ResponseStructure & {
  /**
   * The return data if any for the requested operation.
   */
  data?: T;
};

/**
 * The query params to use for query.
 */
export type QueryParams = string | number | string[] | number[];

/**
 * The constructor for AWS service.
 */
export type AWSServiceConstructor<T> = new ({
  region,
}: {
  /**
   * The region in which AWS service is running.
   */
  region: string;
}) => T;

// ── Investigation models ─────────────────────────────────────────────────────

/**
 * The data sources available for investigation.
 */
export enum DataSource {
  /** CloudWatch log streams. */
  CloudWatchLogs = "cloudwatch_logs",
  /** CloudWatch metrics. */
  CloudWatchMetrics = "cloudwatch_metrics",
  /** ECS task definitions and running tasks. */
  EcsTasks = "ecs",
  /** CodePipeline execution history. */
  CodePipeline = "codepipeline",
  /** Bitbucket pull requests and commits. */
  Bitbucket = "bitbucket",
  /** CloudTrail audit events. */
  CloudTrail = "cloudtrail",
  /** RDS database logs. */
  RdsLogs = "rds_logs",
  /** AWS WAF logs. */
  Waf = "waf",
}

/**
 * The investigation mode.
 */
export enum InvestigationMode {
  /** Automatically detect which services are degraded. */
  Auto = "auto",
  /** Manually select which service to investigate. */
  Manual = "manual",
}

/**
 * Filters applied when scoping an investigation.
 */
export type InvestigationFilters = {
  /** Time window, e.g. "30m", "1h", "3h", "24h". */
  timeRange: string;
  /** Environment label, e.g. "production", "staging". */
  environment: string;
  /** AWS region, e.g. "eu-west-1". */
  region: string;
};

/**
 * The body of a POST /api/investigate request.
 */
export type InvestigationRequest = {
  /** Investigation mode. */
  mode: InvestigationMode;
  /** Service name when mode is manual. */
  service?: string;
  /** Free-text description of the incident. */
  prompt: string;
  /** Scoping filters. */
  filters: InvestigationFilters;
  /** Data sources to query. */
  sources: DataSource[];
};

// ── SSE event models ─────────────────────────────────────────────────────────

/**
 * SSE event types emitted by the investigation stream.
 */
export enum SseEventType {
  /** An MCP tool call status update. */
  ToolCall = "tool_call",
  /** A streamed text chunk from the AI response. */
  Delta = "delta",
  /** End of the investigation stream. */
  Done = "done",
}

/**
 * Status of a single MCP tool call.
 */
export enum ToolCallStatus {
  /** Queued but not yet started. */
  Pending = "pending",
  /** Currently executing. */
  Running = "running",
  /** Completed successfully. */
  Done = "done",
  /** Completed with an error. */
  Error = "error",
}

/**
 * Payload for a tool_call SSE event.
 */
export type SseToolCallEvent = {
  /** OpenAI tool call ID. */
  id: string;
  /** MCP tool name. */
  name: string;
  /** Arguments passed to the tool (present on running status). */
  input?: Record<string, unknown>;
  /** Current status of the tool call. */
  status: ToolCallStatus;
};

/**
 * Payload for a delta SSE event.
 */
export type SseDeltaEvent = {
  /** Streamed text chunk from the AI. */
  text: string;
};
