import dayjs from "dayjs";
import { today } from "./dateUtils";

export const isEvkAktivoitu = (): boolean => {
  const TODAY: string = today().format("YYYY-MM-DD");
  const envParam = process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE;
  if (envParam) {
    try {
      const evkAktivointiPvm = JSON.parse(envParam);
      return isEvkActiveAt(TODAY, evkAktivointiPvm);
    } catch {
      try {
        // param value might be "double-escaped"
        const unescaped = envParam.replace(/\\"/g, '"');
        const evkAktivointiPvm = JSON.parse(unescaped);
        return isEvkActiveAt(TODAY, evkAktivointiPvm);
      } catch (error) {
        // unable to parse envParam, return the 'default' values below
        console.log("unable to parse envParam");
      }
    }
  }
  return false;
};

export const isEvkAktivoituAt = (when: string): boolean => {
  const envParam = process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE;
  if (envParam) {
    try {
      const evkAktivointiPvm = JSON.parse(envParam);
      return isEvkActiveAt(when, evkAktivointiPvm);
    } catch {
      try {
        // param value might be "double-escaped"
        const unescaped = envParam.replace(/\\"/g, '"');
        const evkAktivointiPvm = JSON.parse(unescaped);
        return isEvkActiveAt(when, evkAktivointiPvm);
      } catch (error) {
        // unable to parse envParam, return the 'default' values below
        console.log('unable to parse envParam');
      }
    }
  }
  return false;
};

function isEvkActiveAt(pvm: string, evkAktivointiPvm: string): boolean {
  if (isValidEnvParamObject(evkAktivointiPvm)) {
    const isActive = !(dayjs(pvm).isBefore(evkAktivointiPvm.startDate));
    return isActive;
  }
  return false;
}

function isValidEnvParamObject(obj: any): obj is { startDate: string } {
  return typeof obj === "object" && obj !== null && typeof obj.startDate === "string";
}
