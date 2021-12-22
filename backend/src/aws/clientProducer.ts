import * as AWSXRay from "aws-xray-sdk";

export function produceAWSClient(name: string, p: () => any) {
  const key = "produceAWSClient_" + name;
  if (!(globalThis as any)[key]) {
    (globalThis as any)[key] = AWSXRay.captureAWSv3Client(p());
  }
  return (globalThis as any)[key];
}
