import waf2, { CfnWebACLProps } from "aws-cdk-lib/aws-wafv2";
import { Config } from "./config";
import { Construct } from "constructs";

export class WafConfig extends Construct {
  constructor(scope: Construct, id: string, { api, allowedAddresses: allowedAddresses }: any) {
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
            notStatement: {
              statement: {
                ipSetReferenceStatement: { arn: allowedIPSet.attrArn },
              },
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

    new waf2.CfnWebACLAssociation(this, "APIAssoc", {
      resourceArn: api.arn,
      webAclArn: acl.attrArn,
    });
  }
}
