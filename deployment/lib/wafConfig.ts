import { CfnWebACLProps } from "@aws-cdk/aws-wafv2/lib/wafv2.generated";
import { Config } from "./config";
import * as constructs from "constructs";

const cdk = require("@aws-cdk/core");
const waf2 = require("@aws-cdk/aws-wafv2");

export class WafConfig extends cdk.Construct {
  constructor(scope: constructs.Construct, id: string, { api, allowedAddresses: allowedAddresses }: any) {
    super(scope, id);

    const allowedIPSet = new waf2.CfnIPSet(this, "VaylapilviIPSet", {
      addresses: allowedAddresses,
      ipAddressVersion: "IPV4",
      scope: "REGIONAL",
      name: `vaylapilvi-CIDR-${Config.env}`,
    });

    const props: CfnWebACLProps = {
      defaultAction: { allow: {} },
      scope: "REGIONAL",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: true,
        metricName: `Hassu-${Config.env}`,
      },
      name: `Hassu-ACL-${Config.env}`,
      rules: [
        {
          name: "AllowOnlyFromVaylapilvi",
          action: { block: {} },
          priority: 1,
          statement: {
            andStatement: {
              statements: [
                {
                  byteMatchStatement: {
                    fieldToMatch: { singleHeader: { name: "x-api-key" } },
                    positionalConstraint: "EXACTLY",
                    searchString: api.apiKey,
                    textTransformations: [{ priority: 1, type: "LOWERCASE" }],
                  },
                },
                {
                  notStatement: {
                    statement: {
                      ipSetReferenceStatement: { arn: allowedIPSet.attrArn },
                    },
                  },
                },
              ],
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            sampledRequestsEnabled: true,
            metricName: `Hassu-${Config.env}-AllowOnlyFromVaylapilvi`,
          },
        },
      ],
    };
    const acl = new waf2.CfnWebACL(this, "ACL", props);

    const association = new waf2.CfnWebACLAssociation(this, "APIAssoc", {
      resourceArn: api.arn,
      webAclArn: acl.attrArn,
    });

    this.acl = acl;
    this.association = association;
  }
}
