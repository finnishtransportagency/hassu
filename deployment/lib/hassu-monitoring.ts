import { Construct } from "constructs";
import { Arn, ArnFormat, aws_cloudwatch, aws_lambda, aws_logs, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Config, SSMParameterName } from "./config";
import { FunctionConfiguration, Lambda, ListFunctionsResponse } from "@aws-sdk/client-lambda";
import { SQS } from "@aws-sdk/client-sqs";
import { CloudFrontClient, ListDistributionsCommand, ListTagsForResourceCommand } from "@aws-sdk/client-cloudfront";
import assert from "assert";
import { IWidget } from "aws-cdk-lib/aws-cloudwatch/lib/widget";
import { FilterPattern } from "aws-cdk-lib/aws-logs";
import { InsightsQuery } from "./dashboard/insightsQuery";
import { IQueue, Queue } from "aws-cdk-lib/aws-sqs";
import { CfnAlarm, Metric } from "aws-cdk-lib/aws-cloudwatch";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

type MonitoredLambda = { functionName: string; logGroupName: string; func: aws_lambda.IFunction };

export class HassuMonitoringStack extends Stack {
  constructor(scope: Construct) {
    super(scope, "monitoring", {
      stackName: "hassu-monitoring-" + Config.env,
      env: {
        region: "eu-west-1",
        account: process.env.CDK_DEFAULT_ACCOUNT,
      },
      tags: Config.tags,
    });
  }

  async process(): Promise<void> {
    const env = Config.env;
    const lambdas = await this.listAllLambdasForEnv(env);
    const queues = await this.listAllQueuesForEnv(env);

    const dashboard = new aws_cloudwatch.Dashboard(this, "HassuDashboard-" + env, {
      dashboardName: "HassuDashboard-" + env,
      periodOverride: aws_cloudwatch.PeriodOverride.AUTO,
      start: "-2D",
    });
    dashboard.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const backendLambda = lambdas
      .filter((func) => func.functionName.includes("-backend-") && !func.functionName.includes("-julkinen-"))
      .pop();

    dashboard.addWidgets(...this.createLambdaMetricsWidgets(lambdas));
    dashboard.addWidgets(...this.velhoIntegrationWidgets(backendLambda), new aws_cloudwatch.Column(...this.createSQSWidgets(queues)));
    dashboard.addWidgets(...this.createErrorLogWidgets(lambdas), ...this.createWAFWidgets("aws-waf-logs-hassu"));
    dashboard.addWidgets(...(await this.createCloudFrontWidgets()));

    new InsightsQuery(this, "byCorrelationId", {
      name: `(${env}) Find logs by correlationId`,
      queryString: `filter (tag="BACKEND" or tag="AUDIT") and correlationId = "yourId"
| sort @timestamp desc`,
      logGroupNames: lambdas.map((func) => func.logGroupName),
    });

    new InsightsQuery(this, "byErrorLevel", {
      name: `(${env}) Find all error logs`,
      queryString: `filter (tag="BACKEND" or tag="AUDIT") and level = "error"
| display @timestamp, msg, @message
| sort @timestamp desc`,
      logGroupNames: lambdas.map((func) => func.logGroupName),
    });
  }

  private async listAllLambdasForEnv(env: string) {
    const lambdaClient = new Lambda({});
    const functions = await this.listAllFunctions(lambdaClient);
    return await functions.reduce(async (resultPromise, func) => {
      const result = await resultPromise;
      const functionName = func.FunctionName;
      assert(functionName);
      const completeFunction = await lambdaClient.getFunction({ FunctionName: functionName });
      const tags = completeFunction.Tags;
      if (tags?.Environment == env && functionName) {
        const logGroupName = `/aws/lambda/${completeFunction.Configuration?.FunctionName}`;
        const func = aws_lambda.Function.fromFunctionName(this, functionName, functionName);
        result.push({
          functionName,
          logGroupName,
          func,
        });
      }
      return result;
    }, Promise.resolve([] as MonitoredLambda[]));
  }

  private async listAllQueuesForEnv(env: string): Promise<IQueue[]> {
    const sqsClient = new SQS({});
    const queueUrls = (await sqsClient.listQueues({ MaxResults: 50 })).QueueUrls;
    if (queueUrls) {
      return await queueUrls.reduce(async (resultPromise, queueUrl) => {
        const result = await resultPromise;
        const split = queueUrl.split("/");
        const queueName = split[split.length - 1];
        const tags = (await sqsClient.listQueueTags({ QueueUrl: queueUrl })).Tags;
        if (tags?.Environment == env) {
          result.push(
            Queue.fromQueueArn(
              this,
              queueName,
              Arn.format({ arnFormat: ArnFormat.COLON_RESOURCE_NAME, resource: queueName, service: "sqs" }, this)
            )
          );
        }
        return result;
      }, Promise.resolve([] as IQueue[]));
    }
    return [];
  }

  private createErrorLogWidgets(lambdas: MonitoredLambda[]): IWidget[] {
    // create error log widget
    const logGroupNames = lambdas.map((lambda) => lambda.logGroupName);

    return [
      new aws_cloudwatch.LogQueryWidget({
        title: "Yleisimmät error-tason lokiviestit",
        logGroupNames,
        view: aws_cloudwatch.LogQueryVisualizationType.TABLE,
        width: 12,
        height: 8,
        queryLines: [
          `fields Lukumaara, msg`,
          ` filter tag != "METRIC" and ispresent(level) and level="error"`,
          ` fields substr(msg, 0, 150) as short_msg`,
          ` stats count(*) as Lukumaara by short_msg`,
          ` sort Lukumaara desc`,
          ` display Lukumaara, short_msg`,
        ],
      }),
    ];
  }

  private createLambdaMetricsWidgets(lambdas: MonitoredLambda[]): IWidget[] {
    const graphWidgetMaxConcurrentExecutions = new aws_cloudwatch.GraphWidget({
      title: `Lambda max concurrent invocations`,
      left: lambdas.map((lambda) => lambda.func.metric("ConcurrentExecutions", { statistic: "max" })),
      width: 6,
    });
    const graphWidgetDuration = new aws_cloudwatch.GraphWidget({
      title: `Lambda average execution duration`,
      left: lambdas.map((lambda) => lambda.func.metric("Duration", { statistic: "avg", unit: aws_cloudwatch.Unit.SECONDS })),
      width: 6,
    });
    const graphWidgetInvocations = new aws_cloudwatch.GraphWidget({
      title: `Lambda invocations`,
      left: lambdas.map((lambda) => lambda.func.metric("Invocations", { statistic: "Sum" })),
      width: 6,
    });
    const graphWidgetErrors = new aws_cloudwatch.GraphWidget({
      title: `Lambda errors`,
      left: lambdas.map((lambda) => lambda.func.metric("Errors", { statistic: "Sum" })),
      width: 6,
    });
    return [graphWidgetMaxConcurrentExecutions, graphWidgetDuration, graphWidgetInvocations, graphWidgetErrors];
  }

  private async listAllFunctions(lambdaClient: Lambda) {
    let marker = undefined;
    let functions: FunctionConfiguration[] = [];
    do {
      const listFunctionsResult: ListFunctionsResponse = await lambdaClient.listFunctions({ Marker: marker });
      marker = listFunctionsResult.NextMarker;
      if (listFunctionsResult.Functions) {
        functions = functions.concat(listFunctionsResult.Functions);
      }
    } while (marker);
    return functions;
  }

  private velhoIntegrationWidgets(monitoredLambda: MonitoredLambda | undefined) {
    if (!monitoredLambda) {
      return [];
    }

    const logGroup = aws_logs.LogGroup.fromLogGroupName(this, "log_group_" + monitoredLambda.functionName, monitoredLambda.logGroupName);

    new aws_logs.MetricFilter(this, "latency_metric_filter_" + monitoredLambda.functionName, {
      logGroup,
      metricNamespace: monitoredLambda.functionName,
      metricName: "latency",
      filterPattern: FilterPattern.stringValue("$.tag", "=", "METRIC"),
      metricValue: "$.latency",
      dimensions: { operation: "$.operation" },
    });

    new aws_logs.MetricFilter(this, "error_metric_filter_" + monitoredLambda.functionName, {
      logGroup,
      metricNamespace: monitoredLambda.functionName,
      metricName: "error",
      filterPattern: FilterPattern.all(FilterPattern.stringValue("$.tag", "=", "METRIC"), FilterPattern.booleanValue("$.success", false)),
      metricValue: "1",
      dimensions: { operation: "$.operation" },
    });

    new aws_logs.MetricFilter(this, "success_metric_filter_" + monitoredLambda.functionName, {
      logGroup,
      metricNamespace: monitoredLambda.functionName,
      metricName: "success",
      filterPattern: FilterPattern.all(FilterPattern.stringValue("$.tag", "=", "METRIC"), FilterPattern.booleanValue("$.success", true)),
      metricValue: "1",
      dimensions: { operation: "$.operation" },
    });

    const latencyWidget = new aws_cloudwatch.GraphWidget({
      title: "Velho-integraation viive",
      width: 6,
      height: 8,
      left: [
        new aws_cloudwatch.MathExpression({
          expression: 'SELECT AVG(latency) FROM SCHEMA("' + monitoredLambda.functionName + '", operation) GROUP BY operation',
          label: "",
          period: Duration.seconds(5 * 60),
        }),
      ],
    });

    const successWidget = new aws_cloudwatch.GraphWidget({
      title: "Velho-integraation onnistuneet kutsut",
      width: 6,
      height: 8,
      left: [
        new aws_cloudwatch.MathExpression({
          expression: 'SELECT COUNT(success) FROM SCHEMA("' + monitoredLambda.functionName + '", operation) GROUP BY operation',
          label: "",
          period: Duration.seconds(5 * 60),
        }),
      ],
    });

    const errorWidget = new aws_cloudwatch.LogQueryWidget({
      title: "Velho-integraation virheet",
      region: "eu-west-1",
      logGroupNames: [monitoredLambda.logGroupName],
      view: aws_cloudwatch.LogQueryVisualizationType.TABLE,
      width: 6,
      height: 8,
      queryLines: [
        'filter tag="METRIC" and success = 0',
        "display @timestamp, status, velhoApiName, velhoApiOperation",
        "sort @timestamp desc",
      ],
    });

    return [latencyWidget, successWidget, errorWidget];
  }

  private createWAFWidgets(wafLogGroupName: string) {
    return [
      new aws_cloudwatch.LogQueryWidget({
        title: "Sovelluspalomuurin estämät pyynnöt",
        region: "us-east-1",
        logGroupNames: [wafLogGroupName],
        view: aws_cloudwatch.LogQueryVisualizationType.TABLE,
        width: 12,
        height: 8,
        queryLines: [
          "fields @timestamp, labels.0.name as Rule, httpRequest.country as Country, terminatingRuleId, httpRequest.uri as URI, @message",
          "filter terminatingRuleId not like /Maintenance-.*/",
          "sort @timestamp desc",
        ],
      }),
    ];
  }

  private createSQSWidgets(queues: IQueue[]) {
    return queues.reduce((widgets, queue) => {
      widgets.push(
        new aws_cloudwatch.SingleValueWidget({
          metrics: [
            queue.metricApproximateAgeOfOldestMessage({ label: "AgeOfOldestMessage" }),
            queue.metricApproximateNumberOfMessagesVisible({ label: "NumberOfMessagesVisible" }),
            queue.metricApproximateNumberOfMessagesNotVisible({ label: "NumberOfMessagesNotVisible" }),
          ],
          sparkline: true,
          title: queue.queueName,
          height: 4,
        })
      );
      // widgets.push(
      //   new aws_cloudwatch.GraphWidget({
      //     title: queue.queueName,
      //     legendPosition: LegendPosition.RIGHT,
      //     left: [queue.metricApproximateAgeOfOldestMessage({ label: "AgeOfOldestMessage" })],
      //     right: [
      //       queue.metricApproximateNumberOfMessagesVisible({ label: "NumberOfMessagesVisible" }),
      //       queue.metricApproximateNumberOfMessagesNotVisible({ label: "NumberOfMessagesNotVisible" }),
      //     ],
      //     stacked: true,
      //     height: 4,
      //   })
      // );
      return widgets;
    }, [] as IWidget[]);
  }

  private async createCloudFrontWidgets() {
    const distributionId = await this.findDistributionIdByEnvironmentTag();
    if (!distributionId) {
      return [];
    }

    // Luo 5xx-virhesuhteen metriikka
    const errorRateMetric = new Metric({
      namespace: "AWS/CloudFront",
      metricName: "5xxErrorRate",
      region: "us-east-1",
      dimensionsMap: {
        DistributionId: distributionId,
        Region: "Global",
      },
      statistic: "Max",
      period: Duration.minutes(15),
    });

    const frontend5xxErrors = new aws_cloudwatch.GraphWidget({
      title: `CloudFront error rate`,
      left: [errorRateMetric],
      region: "eu-west-1",
      width: 6,
    });

    // Luo requestien määrän metriikka
    const requestRateMetric = new Metric({
      namespace: "AWS/CloudFront",
      metricName: "Requests",
      region: "us-east-1",
      dimensionsMap: {
        DistributionId: distributionId,
        Region: "Global",
      },
      statistic: "Max",
      period: Duration.minutes(15),
    });

    const requestRateWidget = new aws_cloudwatch.GraphWidget({
      title: `CloudFront requests`,
      left: [requestRateMetric],
      region: "eu-west-1",
      width: 6,
    });

    if (!Config.isDeveloperEnvironment()) {
      // Luo CloudWatch-hälytys 5xx-virhesuhteelle
      new CfnAlarm(this, "CloudFrontErrorRateAlarm", {
        alarmName: "CloudFront error rate - " + Config.env,
        actionsEnabled: true,
        alarmActions: [StringParameter.valueForStringParameter(this, SSMParameterName.HassuAlarmsSNSArn)],
        dimensions: [],
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        comparisonOperator: "GreaterThanUpperThreshold",
        treatMissingData: "notBreaching",
        metrics: [
          {
            id: "m1",
            metricStat: {
              metric: {
                namespace: "AWS/CloudFront",
                metricName: "5xxErrorRate",
                dimensions: [
                  {
                    name: "Region",
                    value: "Global",
                  },
                  {
                    name: "DistributionId",
                    value: distributionId,
                  },
                ],
              },
              period: 900,
              stat: "Average",
            },
            returnData: true,
          },
          {
            id: "ad1",
            expression: "ANOMALY_DETECTION_BAND(m1, 1)",
            label: "5xxErrorRate (expected)",
            returnData: true,
          },
        ],
        thresholdMetricId: "ad1",
      });
    }
    return [frontend5xxErrors, requestRateWidget];
  }

  private async findDistributionIdByEnvironmentTag() {
    const cloudFrontClient = new CloudFrontClient({ region: "us-east-1" });
    let marker = undefined;
    do {
      const listDistributionsResult = (await cloudFrontClient.send(new ListDistributionsCommand({ MaxItems: 100 }))).DistributionList;
      if (!listDistributionsResult) {
        return;
      }
      marker = listDistributionsResult.NextMarker;
      if (listDistributionsResult.Items) {
        for (const element of listDistributionsResult.Items) {
          const distributionSummary = element;
          const cloudFrontArn = distributionSummary.ARN;
          const tagsOutput = await cloudFrontClient.send(new ListTagsForResourceCommand({ Resource: cloudFrontArn }));
          if (tagsOutput.Tags?.Items?.some((tag) => tag.Key == "Environment" && tag.Value == Config.env)) {
            return distributionSummary.Id;
          }
        }
      }
    } while (marker);
  }
}
