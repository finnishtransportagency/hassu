import dayjs from "dayjs";
import { today } from "./dateUtils";

export const isEvkAktivoitu = (): boolean => {
  const envParam = process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE;
  if (envParam) {
    try {
      const evkAktivointiPvm = JSON.parse(envParam);
      if (isValidEnvParamObject(evkAktivointiPvm)) {
        const NOW = today().format("YYYY-MM-DD");
        const isActive = !(dayjs(NOW).isBefore(evkAktivointiPvm.startDate));
        return isActive;
      }
    } catch (error) {
      // unable to parse envParam, return the 'default' values below
      console.log('unable to parse envParam');
    }
  }
  return false;
};

function isValidEnvParamObject(obj: any): obj is { startDate: string } {
  return typeof obj === "object" && obj !== null && typeof obj.startDate === "string";
}
