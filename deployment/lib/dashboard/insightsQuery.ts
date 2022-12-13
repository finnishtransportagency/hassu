import { Construct } from "constructs";
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId, PhysicalResourceIdReference } from "aws-cdk-lib/custom-resources";
import { Aws, aws_iam } from "aws-cdk-lib";

interface InsightsQueryProps {
  name: string;
  queryString: string;
  logGroupNames: string[];
}

export class InsightsQuery extends Construct {
  public resource: AwsCustomResource;

  constructor(scope: Construct, id: string, props: InsightsQueryProps) {
    super(scope, id);

    this.resource = new AwsCustomResource(this, "insightsQuery", {
      policy: AwsCustomResourcePolicy.fromStatements([
        new aws_iam.PolicyStatement({
          effect: aws_iam.Effect.ALLOW,
          actions: ["logs:PutQueryDefinition", "logs:DeleteQueryDefinition"],
          resources: [`arn:aws:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:*`],
        }),
      ]),
      onCreate: {
        action: "putQueryDefinition",
        service: "CloudWatchLogs",
        parameters: {
          name: props.name,
          queryString: props.queryString,
          logGroupNames: props.logGroupNames,
        },
        physicalResourceId: PhysicalResourceId.fromResponse("queryDefinitionId"),
      },
      onUpdate: {
        action: "putQueryDefinition",
        service: "CloudWatchLogs",
        parameters: {
          name: props.name,
          queryDefinitionId: new PhysicalResourceIdReference(),
          queryString: props.queryString,
          logGroupNames: props.logGroupNames,
        },
        physicalResourceId: PhysicalResourceId.fromResponse("queryDefinitionId"),
      },
      onDelete: {
        action: "deleteQueryDefinition",
        service: "CloudWatchLogs",
        parameters: {
          queryDefinitionId: new PhysicalResourceIdReference(),
        },
      },
    });
  }
}
