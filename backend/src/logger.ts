import pino, { LogFn } from "pino";
import { getVaylaUser } from "./user";
import { getCorrelationId, reportError } from "./aws/monitoring";

const level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";
const pretty = process.env.USE_PINO_PRETTY == "true";

function getLogContextOid() {
  return (globalThis as unknown as { oid: string }).oid;
}

export function setLogContextOid(oid: string | undefined): void {
  (globalThis as unknown as { oid: string | undefined }).oid = oid;
}

function getLogger(tag: string) {
  let transport = undefined;
  if (pretty) {
    const isInTest = typeof (global as unknown as Record<string,unknown>).it === "function";
    if (tag == "AUDIT" && isInTest && process.env.TEST_AUDIT_LOG_FILE) {
      transport = { target: "pino/file", options: { destination: process.env.TEST_AUDIT_LOG_FILE } };
    } else {
      transport = {
        target: "pino-pretty",
        options: {
          colorize: true,
          messageFormat: "{tag} {uid} {msg}",
          ignore: "tag,uid",
        },
      };
    }
  }
  // noinspection JSUnusedGlobalSymbols
  return pino({
    level,
    base: undefined,
    mixin: () => {
      return {
        uid: getVaylaUser()?.uid,
        correlationId: getCorrelationId(),
        tag,
        oid: getLogContextOid(),
      };
    },
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
    timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
    hooks: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logMethod(inputArgs: any[], method: LogFn) {
        for (const inputArg of inputArgs) {
          if (inputArg instanceof Error) {
            reportError(inputArg);
          }
        }
        // Flip parameters to make log("message", {object with fields}) work insted of log({object with fields}, "message")
        if (inputArgs.length >= 2) {
          const arg1 = inputArgs.shift();
          const arg2 = inputArgs.shift();
          return method.apply(this, [arg2, arg1, ...inputArgs]);
        }
        if (inputArgs[0]) {
          return method.apply(this, [inputArgs[0]]);
        }
      },
    },
    transport,
  });
}

export function recordVelhoLatencyDecorator(_target: unknown, propertyKey: string, descriptor: PropertyDescriptor): void {
  // keep a reference to the original function
  const originalValue = descriptor.value;

  // Replace the original function with a wrapper
  descriptor.value = async function (...args: unknown[]) {
    // Call the original function
    const start = Date.now();
    try {
      const result = await originalValue.apply(this, args);
      const end = Date.now();
      logMetricLatency(METRIC_INTEGRATION.VELHO, propertyKey, end - start, true);
      return result;
    } catch (e) {
      log.error(e);
      const end = Date.now();
      logMetricLatency(METRIC_INTEGRATION.VELHO, propertyKey, end - start, false);
      throw e;
    }
  };
}

export enum METRIC_INTEGRATION {
  VELHO = "VELHO",
}

export function logMetricLatency(integration: METRIC_INTEGRATION, operation: string, latency: number, success: boolean): void {
  metricLog.info({
    integration,
    operation,
    latency,
    success,
  });
}

export const log = getLogger("BACKEND");
export const auditLog = getLogger("AUDIT");
const metricLog = getLogger("METRIC");
