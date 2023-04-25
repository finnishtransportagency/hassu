import { CloudFront } from "@aws-sdk/client-cloudfront";
import { produce } from "../produce";

export const getCloudFront = (): CloudFront => produce<CloudFront>("cloudfront", () => new CloudFront({ region: "us-east-1" }));
