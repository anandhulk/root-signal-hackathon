import {
  CloudWatchClient,
  GetMetricDataCommand,
  GetMetricStatisticsCommand,
  DescribeAlarmsCommand,
  DescribeAlarmHistoryCommand,
  StateValue,
  HistoryItemType,
  MetricDataQuery,
  Dimension,
  Statistic,
} from "@aws-sdk/client-cloudwatch";
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
  FilterLogEventsCommand,
  StartQueryCommand,
  GetQueryResultsCommand,
  OrderBy,
} from "@aws-sdk/client-cloudwatch-logs";
import { getRegion, getAwsCredentials } from "../auth.js";

function wrapError(err: unknown, context: string): never {
  const message = err instanceof Error ? err.message : String(err);
  throw new Error(`AWS CloudWatch error (${context}): ${message}`);
}

const cw = new CloudWatchClient({
  region: getRegion(),
  credentials: getAwsCredentials(),
});

const cwLogs = new CloudWatchLogsClient({
  region: getRegion(),
  credentials: getAwsCredentials(),
});

export const cloudwatchMethods = {
  async getMetricData(params: {
    startTime: string;
    endTime: string;
    metricDataQueries: MetricDataQuery[];
    maxDatapoints?: number;
  }) {
    try {
      const res = await cw.send(
        new GetMetricDataCommand({
          StartTime: new Date(params.startTime),
          EndTime: new Date(params.endTime),
          MetricDataQueries: params.metricDataQueries,
          ...(params.maxDatapoints ? { MaxDatapoints: params.maxDatapoints } : {}),
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "GetMetricData");
    }
  },

  async getMetricStatistics(params: {
    namespace: string;
    metricName: string;
    startTime: string;
    endTime: string;
    period: number;
    statistics: Statistic[];
    dimensions?: Array<{ name: string; value: string }>;
  }) {
    try {
      const dimensions: Dimension[] | undefined = params.dimensions?.map(
        (d) => ({ Name: d.name, Value: d.value })
      );
      const res = await cw.send(
        new GetMetricStatisticsCommand({
          Namespace: params.namespace,
          MetricName: params.metricName,
          StartTime: new Date(params.startTime),
          EndTime: new Date(params.endTime),
          Period: params.period,
          Statistics: params.statistics,
          ...(dimensions ? { Dimensions: dimensions } : {}),
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "GetMetricStatistics");
    }
  },

  async describeAlarms(params: {
    alarmNamePrefix?: string;
    stateValue?: StateValue;
    maxRecords?: number;
  }) {
    try {
      const res = await cw.send(
        new DescribeAlarmsCommand({
          ...(params.alarmNamePrefix ? { AlarmNamePrefix: params.alarmNamePrefix } : {}),
          ...(params.stateValue ? { StateValue: params.stateValue } : {}),
          ...(params.maxRecords ? { MaxRecords: params.maxRecords } : {}),
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "DescribeAlarms");
    }
  },

  async describeAlarmHistory(params: {
    alarmName: string;
    startDate?: string;
    endDate?: string;
    historyItemType?: HistoryItemType;
    maxRecords?: number;
  }) {
    try {
      const res = await cw.send(
        new DescribeAlarmHistoryCommand({
          AlarmName: params.alarmName,
          ...(params.startDate ? { StartDate: new Date(params.startDate) } : {}),
          ...(params.endDate ? { EndDate: new Date(params.endDate) } : {}),
          ...(params.historyItemType ? { HistoryItemType: params.historyItemType } : {}),
          ...(params.maxRecords ? { MaxRecords: params.maxRecords } : {}),
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "DescribeAlarmHistory");
    }
  },

  async describeLogGroups(params: {
    logGroupNamePrefix?: string;
    limit?: number;
  }) {
    try {
      const res = await cwLogs.send(
        new DescribeLogGroupsCommand({
          ...(params.logGroupNamePrefix ? { logGroupNamePrefix: params.logGroupNamePrefix } : {}),
          ...(params.limit ? { limit: params.limit } : {}),
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "DescribeLogGroups");
    }
  },

  async describeLogStreams(params: {
    logGroupName: string;
    logStreamNamePrefix?: string;
    orderBy?: OrderBy;
    descending?: boolean;
    limit?: number;
  }) {
    try {
      const res = await cwLogs.send(
        new DescribeLogStreamsCommand({
          logGroupName: params.logGroupName,
          ...(params.logStreamNamePrefix ? { logStreamNamePrefix: params.logStreamNamePrefix } : {}),
          ...(params.orderBy ? { orderBy: params.orderBy } : {}),
          ...(params.descending !== undefined ? { descending: params.descending } : {}),
          ...(params.limit ? { limit: params.limit } : {}),
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "DescribeLogStreams");
    }
  },

  async getLogEvents(params: {
    logGroupName: string;
    logStreamName: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
    startFromHead?: boolean;
  }) {
    try {
      const res = await cwLogs.send(
        new GetLogEventsCommand({
          logGroupName: params.logGroupName,
          logStreamName: params.logStreamName,
          ...(params.startTime ? { startTime: new Date(params.startTime).getTime() } : {}),
          ...(params.endTime ? { endTime: new Date(params.endTime).getTime() } : {}),
          ...(params.limit ? { limit: params.limit } : {}),
          ...(params.startFromHead !== undefined ? { startFromHead: params.startFromHead } : {}),
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "GetLogEvents");
    }
  },

  async filterLogEvents(params: {
    logGroupName: string;
    filterPattern: string;
    logStreamNames?: string[];
    startTime?: string;
    endTime?: string;
    limit?: number;
  }) {
    try {
      const res = await cwLogs.send(
        new FilterLogEventsCommand({
          logGroupName: params.logGroupName,
          filterPattern: params.filterPattern,
          ...(params.logStreamNames ? { logStreamNames: params.logStreamNames } : {}),
          ...(params.startTime ? { startTime: new Date(params.startTime).getTime() } : {}),
          ...(params.endTime ? { endTime: new Date(params.endTime).getTime() } : {}),
          ...(params.limit ? { limit: params.limit } : {}),
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "FilterLogEvents");
    }
  },

  async startQuery(params: {
    logGroupNames: string[];
    startTime: string;
    endTime: string;
    queryString: string;
    limit?: number;
  }) {
    try {
      const res = await cwLogs.send(
        new StartQueryCommand({
          logGroupNames: params.logGroupNames,
          startTime: Math.floor(new Date(params.startTime).getTime() / 1000),
          endTime: Math.floor(new Date(params.endTime).getTime() / 1000),
          queryString: params.queryString,
          ...(params.limit ? { limit: params.limit } : {}),
        })
      );
      return res;
    } catch (err) {
      wrapError(err, "StartQuery");
    }
  },

  async getQueryResults(params: { queryId: string }) {
    try {
      const res = await cwLogs.send(
        new GetQueryResultsCommand({ queryId: params.queryId })
      );
      return res;
    } catch (err) {
      wrapError(err, "GetQueryResults");
    }
  },
};
