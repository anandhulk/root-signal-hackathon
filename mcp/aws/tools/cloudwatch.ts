import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cloudwatchMethods } from "../methods/cloudwatch.js";
import { MetricDataQuery, Statistic } from "@aws-sdk/client-cloudwatch";
import { OrderBy } from "@aws-sdk/client-cloudwatch-logs";

export function registerCloudWatchTools(server: McpServer) {
  // ── Metrics ──────────────────────────────────────────────────────────────

  server.registerTool(
    "get_metric_data",
    {
      description:
        "Fetch time-series data for one or more CloudWatch metrics using metric data queries. Supports math expressions. metric_data_queries must be a JSON string representing an array of MetricDataQuery objects.",
      inputSchema: {
        start_time: z
          .string()
          .describe("Start time as ISO 8601 string, e.g. 2024-01-01T00:00:00Z"),
        end_time: z
          .string()
          .describe("End time as ISO 8601 string, e.g. 2024-01-01T01:00:00Z"),
        metric_data_queries: z
          .string()
          .describe(
            'JSON array of MetricDataQuery objects, e.g. [{"Id":"m1","MetricStat":{"Metric":{"Namespace":"AWS/EC2","MetricName":"CPUUtilization","Dimensions":[{"Name":"InstanceId","Value":"i-12345"}]},"Period":300,"Stat":"Average"}}]'
          ),
        max_datapoints: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Maximum number of data points to return"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ start_time, end_time, metric_data_queries, max_datapoints }) => {
      const queries: MetricDataQuery[] = JSON.parse(metric_data_queries);
      const data = await cloudwatchMethods.getMetricData({
        startTime: start_time,
        endTime: end_time,
        metricDataQueries: queries,
        maxDatapoints: max_datapoints,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_metric_statistics",
    {
      description:
        "Get statistics (Average, Sum, Minimum, Maximum, SampleCount) for a single CloudWatch metric over a time range.",
      inputSchema: {
        namespace: z
          .string()
          .describe('CloudWatch namespace, e.g. "AWS/EC2" or "AWS/Lambda"'),
        metric_name: z
          .string()
          .describe('Metric name, e.g. "CPUUtilization" or "Duration"'),
        start_time: z
          .string()
          .describe("Start time as ISO 8601 string"),
        end_time: z
          .string()
          .describe("End time as ISO 8601 string"),
        period: z
          .number()
          .int()
          .positive()
          .describe("Granularity in seconds (e.g. 60, 300, 3600)"),
        statistics: z
          .array(
            z.enum(["Average", "Sum", "Minimum", "Maximum", "SampleCount"])
          )
          .min(1)
          .describe("List of statistics to retrieve"),
        dimensions: z
          .array(
            z.object({
              name: z.string().describe("Dimension name, e.g. InstanceId"),
              value: z.string().describe("Dimension value, e.g. i-12345"),
            })
          )
          .optional()
          .describe("Metric dimensions to filter by"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ namespace, metric_name, start_time, end_time, period, statistics, dimensions }) => {
      const data = await cloudwatchMethods.getMetricStatistics({
        namespace,
        metricName: metric_name,
        startTime: start_time,
        endTime: end_time,
        period,
        statistics: statistics as Statistic[],
        dimensions,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Alarms ───────────────────────────────────────────────────────────────

  server.registerTool(
    "describe_alarms",
    {
      description:
        "List CloudWatch alarms, optionally filtered by name prefix, state, or action prefix.",
      inputSchema: {
        alarm_name_prefix: z
          .string()
          .optional()
          .describe("Filter alarms by name prefix"),
        state_value: z
          .enum(["OK", "ALARM", "INSUFFICIENT_DATA"])
          .optional()
          .describe("Filter alarms by current state"),
        max_records: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(50)
          .describe("Maximum number of alarms to return (max 100)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ alarm_name_prefix, state_value, max_records }) => {
      const data = await cloudwatchMethods.describeAlarms({
        alarmNamePrefix: alarm_name_prefix,
        stateValue: state_value as "OK" | "ALARM" | "INSUFFICIENT_DATA" | undefined,
        maxRecords: max_records,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "describe_alarm_history",
    {
      description:
        "Retrieve history for a specific CloudWatch alarm, including state changes and configuration updates.",
      inputSchema: {
        alarm_name: z.string().describe("Name of the alarm"),
        start_date: z
          .string()
          .optional()
          .describe("Start of history time range as ISO 8601 string"),
        end_date: z
          .string()
          .optional()
          .describe("End of history time range as ISO 8601 string"),
        history_item_type: z
          .enum(["ConfigurationUpdate", "StateUpdate", "Action"])
          .optional()
          .describe("Filter by type of history item"),
        max_records: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(50)
          .describe("Maximum number of history items to return (max 100)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ alarm_name, start_date, end_date, history_item_type, max_records }) => {
      const data = await cloudwatchMethods.describeAlarmHistory({
        alarmName: alarm_name,
        startDate: start_date,
        endDate: end_date,
        historyItemType: history_item_type as
          | "ConfigurationUpdate"
          | "StateUpdate"
          | "Action"
          | undefined,
        maxRecords: max_records,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Logs ─────────────────────────────────────────────────────────────────

  server.registerTool(
    "describe_log_groups",
    {
      description:
        "List CloudWatch Logs log groups, optionally filtered by name prefix.",
      inputSchema: {
        log_group_name_prefix: z
          .string()
          .optional()
          .describe("Filter log groups by name prefix"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(50)
          .describe("Maximum number of log groups to return (max 50)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ log_group_name_prefix, limit }) => {
      const data = await cloudwatchMethods.describeLogGroups({
        logGroupNamePrefix: log_group_name_prefix,
        limit,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "describe_log_streams",
    {
      description:
        "List log streams within a CloudWatch Logs log group.",
      inputSchema: {
        log_group_name: z.string().describe("Name of the log group"),
        log_stream_name_prefix: z
          .string()
          .optional()
          .describe("Filter log streams by name prefix"),
        order_by: z
          .enum(["LogStreamName", "LastEventTime"])
          .default("LastEventTime")
          .describe("Sort order for results"),
        descending: z
          .boolean()
          .default(true)
          .describe("Whether to return results in descending order"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(50)
          .describe("Maximum number of log streams to return (max 50)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ log_group_name, log_stream_name_prefix, order_by, descending, limit }) => {
      const data = await cloudwatchMethods.describeLogStreams({
        logGroupName: log_group_name,
        logStreamNamePrefix: log_stream_name_prefix,
        orderBy: order_by as OrderBy,
        descending,
        limit,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_log_events",
    {
      description:
        "Retrieve log events from a specific log stream in CloudWatch Logs.",
      inputSchema: {
        log_group_name: z.string().describe("Name of the log group"),
        log_stream_name: z.string().describe("Name of the log stream"),
        start_time: z
          .string()
          .optional()
          .describe("Start of time range as ISO 8601 string"),
        end_time: z
          .string()
          .optional()
          .describe("End of time range as ISO 8601 string"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(10000)
          .default(100)
          .describe("Maximum number of log events to return (max 10000)"),
        start_from_head: z
          .boolean()
          .default(false)
          .describe(
            "If true, returns earliest events first; if false, returns most recent events first"
          ),
      },
      annotations: { readOnlyHint: true },
    },
    async ({
      log_group_name,
      log_stream_name,
      start_time,
      end_time,
      limit,
      start_from_head,
    }) => {
      const data = await cloudwatchMethods.getLogEvents({
        logGroupName: log_group_name,
        logStreamName: log_stream_name,
        startTime: start_time,
        endTime: end_time,
        limit,
        startFromHead: start_from_head,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "filter_log_events",
    {
      description:
        "Search log events across one or more streams in a CloudWatch Logs log group using a filter pattern.",
      inputSchema: {
        log_group_name: z.string().describe("Name of the log group"),
        filter_pattern: z
          .string()
          .describe(
            'CloudWatch filter pattern, e.g. "ERROR" or "[timestamp, requestId, level=ERROR, ...]"'
          ),
        log_stream_names: z
          .array(z.string())
          .optional()
          .describe("Limit search to specific log stream names"),
        start_time: z
          .string()
          .optional()
          .describe("Start of time range as ISO 8601 string"),
        end_time: z
          .string()
          .optional()
          .describe("End of time range as ISO 8601 string"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(10000)
          .default(100)
          .describe("Maximum number of events to return (max 10000)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({
      log_group_name,
      filter_pattern,
      log_stream_names,
      start_time,
      end_time,
      limit,
    }) => {
      const data = await cloudwatchMethods.filterLogEvents({
        logGroupName: log_group_name,
        filterPattern: filter_pattern,
        logStreamNames: log_stream_names,
        startTime: start_time,
        endTime: end_time,
        limit,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "start_query",
    {
      description:
        "Start a CloudWatch Logs Insights query across one or more log groups. Returns a query_id to poll with get_query_results.",
      inputSchema: {
        log_group_names: z
          .array(z.string())
          .min(1)
          .describe("List of log group names to query"),
        start_time: z
          .string()
          .describe("Start of query time range as ISO 8601 string"),
        end_time: z
          .string()
          .describe("End of query time range as ISO 8601 string"),
        query_string: z
          .string()
          .describe(
            'CloudWatch Logs Insights query, e.g. "fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"'
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(10000)
          .optional()
          .describe("Maximum number of rows to return in results"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ log_group_names, start_time, end_time, query_string, limit }) => {
      const data = await cloudwatchMethods.startQuery({
        logGroupNames: log_group_names,
        startTime: start_time,
        endTime: end_time,
        queryString: query_string,
        limit,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_query_results",
    {
      description:
        "Retrieve the status and results of a CloudWatch Logs Insights query started with start_query. Poll until status is Complete.",
      inputSchema: {
        query_id: z
          .string()
          .describe("The query ID returned by start_query"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query_id }) => {
      const data = await cloudwatchMethods.getQueryResults({ queryId: query_id });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
