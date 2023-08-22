import { CfnLoggingConfiguration, CfnRegexPatternSet, CfnWebACL, CfnWebACLProps } from "aws-cdk-lib/aws-wafv2";
import { Config, EnvName } from "./config";
import { Construct } from "constructs";
import { ArnFormat, CfnOutput, Stack } from "aws-cdk-lib";
import { BaseConfig } from "../../common/BaseConfig";
import { LogGroup } from "aws-cdk-lib/aws-logs";

export class FrontendWafStack extends Stack {
  constructor(scope: Construct) {
    super(scope, "frontendwaf", {
      stackName: "frontendwaf",
      terminationProtection: false,
      env: {
        region: "us-east-1",
      },
      tags: Config.tags,
    });

    const maintenanceModeRules: CfnWebACL.RuleProperty[] = [];
    let priority = managedRules.length + 1;
    for (const envName in EnvName) {
      const envConfig = Config.getEnvConfig(envName);
      if (BaseConfig.isProductionEnvironment() !== envConfig.isDevAccount && envConfig.waf) {
        const maintenanceModeRegexSet = new CfnRegexPatternSet(this, "maintenancemode-" + envName, {
          name: "Maintenancemode-" + envName,
          description:
            "Huoltokatkokytkin " +
            envName +
            "-ymparistolle. Jos regexp on ympariston hostname, niin huoltokatko on kaynnissa. Jos varattu-huoltokatkolle, niin huoltokatkoa ei ole.",
          scope: "CLOUDFRONT",
          tags: [
            { key: "Project", value: Config.tags.Project },
            { key: "Environment", value: envName },
          ],
          regularExpressionList: ["^varattu-huoltokatkolle$"],
        });

        maintenanceModeRules.push({
          name: "Maintenance-" + envName,
          priority: priority++,
          statement: {
            andStatement: {
              statements: [
                {
                  regexPatternSetReferenceStatement: {
                    arn: maintenanceModeRegexSet.attrArn,
                    fieldToMatch: {
                      singleHeader: { Name: "host" },
                    },
                    textTransformations: [
                      {
                        priority: 0,
                        type: "NONE",
                      },
                    ],
                  },
                },

                {
                  notStatement: {
                    statement: {
                      byteMatchStatement: {
                        fieldToMatch: {
                          uriPath: {},
                        },
                        positionalConstraint: "STARTS_WITH",
                        searchString: "/huoltokatko/",
                        textTransformations: [
                          {
                            priority: 0,
                            type: "NONE",
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
          action: {
            block: {
              customResponse: {
                responseCode: 302,
                responseHeaders: [
                  {
                    name: "Location",
                    value: "/huoltokatko/index.html",
                  },
                ],
              },
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: false,
            cloudWatchMetricsEnabled: false,
            metricName: "Maintenance-" + envName,
          },
        });
      }
    }

    const props: CfnWebACLProps = {
      defaultAction: { allow: {} },
      scope: "CLOUDFRONT",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: true,
        metricName: `Hassu-Frontend-WAF`,
      },
      name: `Hassu-ACL-Frontend`,
      rules: [...managedRules, ...maintenanceModeRules],
      customResponseBodies: {
        "Site-under-maintenance": { content: "<html lang='fi'><body>Asennuskatko</body></html>", contentType: "TEXT_HTML" },
      },
    };

    const cfnWebACL = new CfnWebACL(this, "frontendWAF", props);

    const webAclLogGroup = new LogGroup(this, "awsWafLogs", {
      logGroupName: `aws-waf-logs-hassu`,
    });

    // Create logging configuration with log group as destination
    new CfnLoggingConfiguration(this, "webAclLoggingConfiguration", {
      logDestinationConfigs: [
        // Construct the different ARN format from the logGroupName
        Stack.of(this).formatArn({
          arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          service: "logs",
          resource: "log-group",
          resourceName: webAclLogGroup.logGroupName,
        }),
      ],
      resourceArn: cfnWebACL.attrArn,
      loggingFilter: {
        Filters: [
          {
            Behavior: "DROP",
            Requirement: "MEETS_ALL",
            Conditions: [
              {
                ActionCondition: {
                  Action: "ALLOW",
                },
              },
            ],
          },
        ],
        DefaultBehavior: "KEEP",
      },
    });

    new CfnOutput(this, "frontendWAFArn", {
      value: cfnWebACL.attrArn,
      exportName: "frontendWAFArn",
    });
  }
}

const managedRules: CfnWebACL.RuleProperty[] = [
  {
    name: "AWS-AWSManagedRulesAdminProtectionRuleSet",
    priority: 0,
    statement: {
      managedRuleGroupStatement: {
        vendorName: "AWS",
        name: "AWSManagedRulesAdminProtectionRuleSet",
      },
    },
    overrideAction: {
      none: {},
    },
    visibilityConfig: {
      sampledRequestsEnabled: true,
      cloudWatchMetricsEnabled: true,
      metricName: "AWS-AWSManagedRulesAdminProtectionRuleSet",
    },
  },
  {
    name: "AWS-AWSManagedRulesAmazonIpReputationList",
    priority: 1,
    statement: {
      managedRuleGroupStatement: {
        vendorName: "AWS",
        name: "AWSManagedRulesAmazonIpReputationList",
      },
    },
    overrideAction: {
      none: {},
    },
    visibilityConfig: {
      sampledRequestsEnabled: true,
      cloudWatchMetricsEnabled: true,
      metricName: "AWS-AWSManagedRulesAmazonIpReputationList",
    },
  },
  {
    name: "AWS-AWSManagedRulesCommonRuleSet",
    priority: 3,
    statement: {
      managedRuleGroupStatement: {
        vendorName: "AWS",
        name: "AWSManagedRulesCommonRuleSet",
        ruleActionOverrides: [
          {
            name: "SizeRestrictions_BODY",
            actionToUse: {
              allow: {},
            },
          },
          {
            name: "CrossSiteScripting_COOKIE",
            actionToUse: {
              allow: {},
            },
          },
        ],
      },
    },
    overrideAction: {
      none: {},
    },
    visibilityConfig: {
      sampledRequestsEnabled: true,
      cloudWatchMetricsEnabled: true,
      metricName: "AWS-AWSManagedRulesCommonRuleSet",
    },
  },
  {
    name: "AWS-AWSManagedRulesKnownBadInputsRuleSet",
    priority: 4,
    statement: {
      managedRuleGroupStatement: {
        vendorName: "AWS",
        name: "AWSManagedRulesKnownBadInputsRuleSet",
      },
    },
    overrideAction: {
      none: {},
    },
    visibilityConfig: {
      sampledRequestsEnabled: true,
      cloudWatchMetricsEnabled: true,
      metricName: "AWS-AWSManagedRulesKnownBadInputsRuleSet",
    },
  },
  {
    name: "Rajoita-haitallista-liikennetta",
    priority: 5,
    statement: {
      rateBasedStatement: {
        limit: 2000,
        aggregateKeyType: "IP",
      },
    },
    visibilityConfig: {
      sampledRequestsEnabled: true,
      cloudWatchMetricsEnabled: true,
      metricName: "Rajoita-haitallista-liikennetta",
    },
    action: {
      block: {},
    },
  },
];
