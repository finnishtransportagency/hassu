import { Construct } from "constructs";
import { aws_cloudwatch, aws_lambda, aws_logs, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Config } from "./config";
import Lambda, { FunctionConfiguration } from "aws-sdk/clients/lambda";
import assert from "assert";
import { IWidget } from "aws-cdk-lib/aws-cloudwatch/lib/widget";
import { FilterPattern } from "aws-cdk-lib/aws-logs";
import { InsightsQuery } from "./dashboard/insightsQuery";

export type HassuMonitoringStackProps = {
  //
};

type MonitoredLambda = { functionName: string; logGroupName: string; func: aws_lambda.IFunction };

export class HassuMonitoringStack extends Stack {
  constructor(scope: Construct, props?: HassuMonitoringStackProps) {
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
    const lambdaClient = new Lambda();
    const functions = await this.listAllFunctions(lambdaClient);
    const lambdas = await functions.reduce(async (resultPromise, func) => {
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

    const dashboard = new aws_cloudwatch.Dashboard(this, "HassuDashboard-" + env, {
      dashboardName: "HassuDashboard-" + env,
      periodOverride: aws_cloudwatch.PeriodOverride.AUTO,
      start: "-2D",
    });
    dashboard.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const backendLambda = lambdas.filter((func) => func.functionName.includes("-backend-")).pop();

    dashboard.addWidgets(...this.createLambdaMetricsWidgets(lambdas));
    dashboard.addWidgets(...this.velhoIntegrationWidgets(backendLambda));
    dashboard.addWidgets(...this.createErrorLogWidgets(lambdas));

    new InsightsQuery(this, "byCorrelationId", {
      name: `(${env}) Find logs by correlationId`,
      queryString: `filter (tag="BACKEND" or tag="AUDIT") and correlationId = "yourId"
| sort @timestamp desc
| limit 50`,
      logGroupNames: lambdas.map((func) => func.logGroupName),
    });

    new InsightsQuery(this, "byErrorLevel", {
      name: `(${env}) Find all error logs`,
      queryString: `filter (tag="BACKEND" or tag="AUDIT") and level = "error"
| display @timestamp, msg, @message
| sort @timestamp desc
| limit 50`,
      logGroupNames: lambdas.map((func) => func.logGroupName),
    });
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
          ` limit 50`,
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
}
