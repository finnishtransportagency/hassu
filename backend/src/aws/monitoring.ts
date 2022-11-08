import * as AWSXRay from "aws-xray-sdk-core";
import { Subsegment } from "aws-xray-sdk-core";
import { config } from "../config";

import http from "http";

import https from "https";
import { AxiosStatic } from "axios";

const XRAY_ENV_NAME = "_X_AMZN_TRACE_ID";
const TRACE_ID_REGEX = /^Root=(.+);Parent=(.+);/;

export const getCorrelationId = (): string | undefined => {
  const tracingInfo = process.env[XRAY_ENV_NAME] || "";
  const matches = tracingInfo.match(TRACE_ID_REGEX) || ["", "", ""];

  const correlationId = matches[1];
  if (correlationId) {
    return correlationId;
  }
};

export const reportError = (error: Error): void => {
  if (isXRayEnabled()) {
    const segment = AWSXRay.getSegment();
    try {
      // Verify that the segment is a subsegment
      if (segment instanceof Subsegment) {
        segment?.addError(error);
      } else if (segment) {
        segment.addNewSubsegment("Error").addError(error);
      }
    } catch (e) {
      // Using pino logger here causes a recursive loop
      console.warn(e); // https://github.com/aws/aws-xray-sdk-node/issues/448
    }
  }
};

export function setupLambdaMonitoring(): void {
  if (isXRayEnabled()) {
    AWSXRay.captureHTTPsGlobal(http, isXRayDownstreamEnabled());
    AWSXRay.captureHTTPsGlobal(https, isXRayDownstreamEnabled());
    AWSXRay.capturePromise();
  }
  const correlationId = getCorrelationId();
  if (correlationId) {
    (globalThis as any).correlationId = correlationId;
  } else {
    (globalThis as any).correlationId = undefined;
  }
}

export function getAxios(): AxiosStatic {
  if (isXRayEnabled()) {
    AWSXRay.captureHTTPsGlobal(http, isXRayDownstreamEnabled());
    AWSXRay.captureHTTPsGlobal(https, isXRayDownstreamEnabled());
    AWSXRay.capturePromise();
  }
  return require("axios");
}

export function setupLambdaMonitoringMetaData(subsegment: AWSXRay.Subsegment | undefined): void {
  const correlationId = getCorrelationId();
  subsegment?.addAnnotation("env", config.env || "undefined");
  if (correlationId) {
    subsegment?.addAnnotation("correlationId", correlationId);
  }
}

export async function wrapXRayAsync<T>(segmentName: string, f: (subsegment: AWSXRay.Subsegment | undefined) => T): Promise<T> {
  if (isXRayEnabled()) {
    return AWSXRay.captureAsyncFunc(segmentName, async (subsegment) => {
      try {
        return f(subsegment);
      } finally {
        if (subsegment) {
          subsegment.close();
        }
      }
    });
  } else {
    return f(undefined);
  }
}

export function wrapXRayCaptureAWSClient<T>(client: T): T {
  if (isXRayEnabled()) {
    return AWSXRay.captureAWSClient(client);
  }
  return client;
}

export function isXRayEnabled(): boolean {
  return process.env.HASSU_XRAY_ENABLED !== "false";
}

export function isXRayDownstreamEnabled(): boolean {
  return process.env.HASSU_XRAY_DOWNSTREAM_ENABLED !== "false";
}

export function disableXRay(): void {
  process.env.HASSU_XRAY_ENABLED = "false";
}

export function disableXRayDownstream(): void {
  process.env.HASSU_XRAY_DOWNSTREAM_ENABLED = "false";
}
