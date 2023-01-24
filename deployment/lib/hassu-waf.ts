import { CfnRegexPatternSet, CfnWebACL, CfnWebACLProps } from "aws-cdk-lib/aws-wafv2";
import { Config, EnvName } from "./config";
import { Construct } from "constructs";
import { CfnOutput, Stack } from "aws-cdk-lib";
import { BaseConfig } from "../../common/BaseConfig";

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
    let priority = 5;
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
          action: {
            block: {
              customResponse: {
                responseCode: 503,
                customResponseBodyKey: "Site-under-maintenance",
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
    new CfnOutput(this, "frontendWAFArn", {
      value: cfnWebACL.attrArn,
      exportName: "frontendWAFArn",
    });
  }
}

const managedRules = [
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
    name: "AWS-AWSManagedRulesAnonymousIpList",
    priority: 2,
    statement: {
      managedRuleGroupStatement: {
        vendorName: "AWS",
        name: "AWSManagedRulesAnonymousIpList",
      },
    },
    overrideAction: {
      none: {},
    },
    visibilityConfig: {
      sampledRequestsEnabled: true,
      cloudWatchMetricsEnabled: true,
      metricName: "AWS-AWSManagedRulesAnonymousIpList",
    },
  },
  {
    name: "AWS-AWSManagedRulesCommonRuleSet",
    priority: 3,
    statement: {
      managedRuleGroupStatement: {
        vendorName: "AWS",
        name: "AWSManagedRulesCommonRuleSet",
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
];
