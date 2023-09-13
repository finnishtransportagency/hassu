import useSWR from "swr";
import { apiConfig, AsiakirjaTyyppi } from "@services/api";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo } from "react";

export function useAsianhallinnanTila(oid: string | undefined, asiakirjaTyyppi: AsiakirjaTyyppi) {
  const api = useApi();

  const asianhallinnanTilaLoader = useMemo(() => loader(api), [api]);

  return useSWR([apiConfig.asianhallinnanTila.graphql, oid, asiakirjaTyyppi], asianhallinnanTilaLoader, {});
}

const loader = (api: API) => async (_query: string, oid: string | undefined, asiakirjaTyyppi: AsiakirjaTyyppi) => {
  if (oid) {
    return await api.lataaAsianhallinnanTila(oid, asiakirjaTyyppi);
  }
};

export default useAsianhallinnanTila;
