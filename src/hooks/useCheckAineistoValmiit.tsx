import useApi from "./useApi";
import log from "loglevel";
import { useCallback } from "react";

export type CheckAineistoValmiitOptions = {
  retries?: number;
  delayBetweenRetries?: number;
};

export const useCheckAineistoValmiit = (oid: string) => {
  const api = useApi();

  return useCallback(
    async function checkAineistoValmiit(
      { retries = 0, delayBetweenRetries = 2000 }: CheckAineistoValmiitOptions = { retries: 0, delayBetweenRetries: 2000 }
    ) {
      try {
        const tila = await api.lataaProjektinTila(oid);
        if (!tila.aineistotValmiit && retries > 0) {
          await sleep(2000);
          await checkAineistoValmiit({ retries: retries - 1, delayBetweenRetries });
        }
      } catch (e) {
        log.error(e);
      }
    },
    [api, oid]
  );
};

const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time));
