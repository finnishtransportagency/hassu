import { useEffect, useMemo } from "react";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import useSWR, { Fetcher, SWRConfiguration } from "swr";
import { apiConfig, OmistajahakuTila, ProjektinTiedottaminen } from "@services/api";
import { useRouter } from "next/router";
import { useInterval } from "./useInterval";

export type UseIsProjektinTilaOptions =
  | SWRConfiguration<ProjektinTiedottaminen | null, any, Fetcher<ProjektinTiedottaminen | null>>
  | undefined;

const defaultOptions = {
  revalidateOnFocus: true,
  revalidateIfStale: true,
  revalidateOnReconnect: true,
};

export const useProjektinTiedottaminen = (_config: UseIsProjektinTilaOptions = {}) => {
  const config: UseIsProjektinTilaOptions = useMemo(() => ({ ...defaultOptions, ..._config }), [_config]);
  const api = useApi();
  const router = useRouter();

  const projektiLoader = useMemo(() => getProjektinTilaLoader(api), [api]);

  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  return useSWR([apiConfig.haeProjektinTiedottamistiedot.graphql, oid], projektiLoader, config);
};

const getProjektinTilaLoader = (api: API) => async (_query: string, oid: string | undefined) => {
  if (!oid) {
    return null;
  }
  return await api.haeProjektinTiedottamistiedot(oid);
};

export function useProjektinTiedottaminenReady(oid: string, tiedottaminen: ProjektinTiedottaminen | undefined, setTiedottaminen: (tiedottaminen: ProjektinTiedottaminen | undefined) => void) {
  const api = useApi();
  const { data } = useProjektinTiedottaminen();
  useEffect(() => {
    setTiedottaminen(data ?? undefined);
  }, [data]);
  useInterval(
    async () => {
      const tila = await api.haeProjektinTiedottamistiedot(oid);
      if (tila?.omistajahakuTila !== OmistajahakuTila.KAYNNISSA) {
        setTiedottaminen(tila);
        return false;
      } else {
        setTiedottaminen(tila);
        return true;
      }
    },
    10000,
    65,
    [oid, tiedottaminen]
  );
}