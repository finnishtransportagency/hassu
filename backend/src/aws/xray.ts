import * as AWSXRay from "aws-xray-sdk";
import { Subsegment } from "aws-xray-sdk";

export function setupXRay() {
  AWSXRay.captureHTTPsGlobal(require("http"), true);
  AWSXRay.captureHTTPsGlobal(require("https"), true);
  AWSXRay.capturePromise();
}

export function wrapXray<T>(segmentName: string, f: () => T): T {
  let segment: Subsegment | undefined;
  try {
    segment = AWSXRay.getSegment()?.addNewSubsegment(segmentName);
    return f();
  } finally {
    if (segment && !segment.isClosed()) {
      segment.close();
    }
  }
}

export async function wrapXrayAsync<T>(segmentName: string, f: () => T): Promise<T> {
  let segment: Subsegment | undefined;
  try {
    segment = AWSXRay.getSegment()?.addNewSubsegment(segmentName);
    return f();
  } finally {
    if (segment && !segment.isClosed()) {
      segment.close();
    }
  }
}
