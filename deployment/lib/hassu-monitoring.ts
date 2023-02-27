import { Construct } from "constructs";
import { Arn, ArnFormat, aws_cloudwatch, aws_lambda, aws_logs, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Config } from "./config";
import Lambda, { FunctionConfiguration } from "aws-sdk/clients/lambda";
import Sqs from "aws-sdk/clients/sqs";
import assert from "assert";
import { IWidget } from "aws-cdk-lib/aws-cloudwatch/lib/widget";
import { FilterPattern } from "aws-cdk-lib/aws-logs";
import { InsightsQuery } from "./dashboard/insightsQuery";
import { IQueue, Queue } from "aws-cdk-lib/aws-sqs";

type MonitoredLambda = { functionName: string; logGroupName: string; func: aws_lambda.IFunction };

export class HassuMonitoringStack extends Stack {
  constructor(scope: Construct) {
    super(scope, "monitoring", {
      stackName: "hassu-monitoring-" + Config.env,
      env: {
        region: "eu-west-1",
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

    const backendLambda = lambdas.filter((func) => func.functionName.includes("-backend-")).pop();

    dashboard.addWidgets(...this.createLambdaMetricsWidgets(lambdas));
    dashboard.addWidgets(...this.velhoIntegrationWidgets(backendLambda), new aws_cloudwatch.Column(...this.createSQSWidgets(queues)));
    dashboard.addWidgets(...this.createErrorLogWidgets(lambdas), ...this.createWAFWidgets("aws-waf-logs-hassu"));

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
    const lambdaClient = new Lambda();
    const functions = await this.listAllFunctions(lambdaClient);
    return await functions.reduce(async (resultPromise, func) => {
      const result = await resultPromise;
      const functionName = func.FunctionName;
      assert(functionName);
      const completeFunction = await lambdaClient.getFunction({ FunctionName: functionName }).promise();
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
    const sqsClient = new Sqs();
    const queueUrls = (await sqsClient.listQueues({ MaxResults: 50 }).promise()).QueueUrls;
    if (queueUrls) {
      return await queueUrls.reduce(async (resultPromise, queueUrl) => {
        const result = await resultPromise;
        const split = queueUrl.split("/");
        const queueName = split[split.length - 1];
        const tags = (await sqsClient.listQueueTags({ QueueUrl: queueUrl }).promise()).Tags;
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
          ` filter ispresent(level) and level="error"`,
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
      const listFunctionsResult: Lambda.ListFunctionsResponse = await lambdaClient.listFunctions({ Marker: marker }).promise();
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

    const errorWidget = new aws_cloudwatch.GraphWidget({
      title: "Velho-integraation virheet",
      width: 6,
      height: 8,
      left: [
        new aws_cloudwatch.MathExpression({
          expression: 'SELECT COUNT(error) FROM SCHEMA("' + monitoredLambda.functionName + '", operation) GROUP BY operation',
          label: "",
          period: Duration.seconds(5 * 60),
        }),
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
}
