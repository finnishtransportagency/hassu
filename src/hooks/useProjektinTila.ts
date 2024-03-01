import { useInterval } from "./useInterval";

import { useEffect, useMemo, useState } from "react";
import useApi from "./useApi";
import { useProjekti } from "./useProjekti";
import { API } from "@services/api/commonApi";
import useSWR, { Fetcher, SWRConfiguration } from "swr";
import { apiConfig, ProjektinTila } from "@services/api";

export default function useIsProjektiReadyForTilaChange() {
  const [isReady, setIsReady] = useState(false);

  const api = useApi();

  const { data: projekti } = useProjekti();

  useEffect(() => {
    setIsReady(false);
  }, [projekti]);

  useInterval(
    async () => {
      let tila = projekti?.oid ? await api.lataaProjektinTila(projekti.oid) : undefined;
      if (tila?.aineistotValmiit) {
        setIsReady(true);
        return false;
      } else {
        setIsReady(false);
        return true;
      }
    },
    2000,
    120,
    [projekti]
  );

  return isReady;
}

export type UseIsProjektinTilaOptions = SWRConfiguration<ProjektinTila | null, any, Fetcher<ProjektinTila | null>> | undefined;

const defaultOptions = {
  revalidateOnFocus: true,
  revalidateIfStale: true,
  revalidateOnReconnect: true,
  refreshInterval: 10000,
};

export const useProjektinTila = (_config: UseIsProjektinTilaOptions = {}) => {
  const config: UseIsProjektinTilaOptions = useMemo(() => ({ ...defaultOptions, ..._config }), [_config]);
  const api = useApi();
  const { data: projekti } = useProjekti();

  const projektiLoader = useMemo(() => getProjektinTilaLoader(api), [api]);

  return useSWR([apiConfig.projektinTila.graphql, projekti?.oid], projektiLoader, config);
};

const getProjektinTilaLoader = (api: API) => async (_query: string, oid: string | undefined) => {
  if (!oid) {
    return null;
  }
  return await api.lataaProjektinTila(oid);
};
