import * as AWSXRay from "aws-xray-sdk-core";
import { Subsegment } from "aws-xray-sdk-core";
import { config } from "../config";

import http from "http";

import https from "https";

const XRAY_ENV_NAME = "_X_AMZN_TRACE_ID";
const TRACE_ID_REGEX = /^Root=(.+);Parent=(.+);/;

export const getCorrelationId = () => {
  const tracingInfo = process.env[XRAY_ENV_NAME] || "";
  const matches = tracingInfo.match(TRACE_ID_REGEX) || ["", "", ""];

  const correlationId = matches[1];
  if (correlationId) {
    return correlationId;
  }
};

export const reportError = (error: Error) => {
  const segment = AWSXRay.getSegment();
  try {
    segment?.addError(error);
  } catch (e) {
    // Using pino logger here causes a recursive loop
    console.warn(e); // https://github.com/aws/aws-xray-sdk-node/issues/448
  }
};

export function setupLambdaMonitoring() {
  AWSXRay.captureHTTPsGlobal(http, true);
  AWSXRay.captureHTTPsGlobal(https, true);
  AWSXRay.capturePromise();

  const correlationId = getCorrelationId();
  if (correlationId) {
    (globalThis as any).correlationId = correlationId;
  } else {
    (globalThis as any).correlationId = undefined;
  }
}

export function getAxios() {
  AWSXRay.captureHTTPsGlobal(http, true);
  AWSXRay.captureHTTPsGlobal(https, true);
  AWSXRay.capturePromise();
  return require("axios");
}

export function setupLambdaMonitoringMetaData(subsegment: Subsegment | undefined) {
  const correlationId = getCorrelationId();
  subsegment?.addAnnotation("env", config.env || "undefined");
  if (correlationId) {
    subsegment?.addAnnotation("correlationId", correlationId);
  }
}

export function wrapXray<T>(segmentName: string, f: () => T): T {
  return AWSXRay.captureFunc(segmentName, () => {
    return f();
  });
}

export async function wrapXrayAsync<T>(segmentName: string, f: () => T): Promise<T> {
  return await AWSXRay.captureAsyncFunc(segmentName, async (subsegment) => {
    try {
      return await f();
    } finally {
      if (subsegment) {
        subsegment.close();
      }
    }
  });
}
