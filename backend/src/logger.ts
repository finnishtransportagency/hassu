import pino, { LogFn } from "pino";
import { getVaylaUser } from "./user";
import { getCorrelationId, reportError } from "./aws/monitoring";

const level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";

function getLogger(tag: string) {
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
  });
}

export const log = getLogger("YLLAPITO");
export const auditLog = getLogger("AUDIT");
