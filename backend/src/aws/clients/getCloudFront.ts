import Cloudfront from "aws-sdk/clients/cloudfront";
import { produce } from "../produce";

export const getCloudFront = (): Cloudfront => produce<Cloudfront>("cloudfront", () => new Cloudfront({ region: "us-east-1" }));
