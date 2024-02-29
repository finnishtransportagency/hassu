import { useMemo } from "react";
import useApi from "./useApi";
import { useProjekti } from "./useProjekti";
import { API } from "@services/api/commonApi";
import useSWR, { Fetcher, SWRConfiguration } from "swr";
import { apiConfig, ProjektinTiedottaminen } from "@services/api";

export type UseIsProjektinTilaOptions =
  | SWRConfiguration<ProjektinTiedottaminen | null, any, Fetcher<ProjektinTiedottaminen | null>>
  | undefined;

const defaultOptions = {
  revalidateOnFocus: true,
  revalidateIfStale: true,
  revalidateOnReconnect: true,
  refreshInterval: 10000,
};

export const useProjektinTiedottaminen = (_config: UseIsProjektinTilaOptions = {}) => {
  const config: UseIsProjektinTilaOptions = useMemo(() => ({ ...defaultOptions, ..._config }), [_config]);
  const api = useApi();
  const { data: projekti } = useProjekti();

  const projektiLoader = useMemo(() => getProjektinTilaLoader(api), [api]);

  return useSWR([apiConfig.haeProjektinTiedottamistiedot.graphql, projekti?.oid], projektiLoader, config);
};

const getProjektinTilaLoader = (api: API) => async (_query: string, oid: string | undefined) => {
  if (!oid) {
    return null;
  }
  return await api.haeProjektinTiedottamistiedot(oid);
};
