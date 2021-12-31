import * as AWSXRay from "aws-xray-sdk";

export function produceAWSClient<T>(name: string, p: () => T, override: boolean = false): T {
  const key = "produceAWSClient_" + name;
  if (!(globalThis as any)[key] || override) {
    (globalThis as any)[key] = AWSXRay.captureAWSv3Client(p() as any);
  }
  return (globalThis as any)[key];
}
