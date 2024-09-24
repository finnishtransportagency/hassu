import useApi from "./useApi";
import log from "loglevel";
import { useCallback } from "react";

export const useWaitAineistoValmiit = (oid: string) => {
  const api = useApi();

  const aineistotValmiit = useCallback(
    async (retryCount: number) => {
      try {
        const tila = await api.lataaProjektinTila(oid);
        if (!tila.aineistotValmiit && retryCount > 0) {
          await sleep(2000);
          await aineistotValmiit(retryCount - 1);
        }
      } catch (e) {
        log.error(e);
      }
    },
    [api, oid]
  );
  return aineistotValmiit;
};

const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time));
