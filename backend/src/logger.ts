import pino, { LogFn } from "pino";
import { getVaylaUser } from "./user";
import { getCorrelationId, reportError } from "./aws/monitoring";

const level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";
const pretty = process.env.USE_PINO_PRETTY == "true";

function getLogger(tag: string) {
  let transport = undefined;
  if (pretty) {
    transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    };
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
      };
    },
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
    timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
    hooks: {
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
        return method.apply(this, [inputArgs[0]]);
      },
    },
    transport,
  });
}

export const log = getLogger("YLLAPITO");
export const auditLog = getLogger("AUDIT");
