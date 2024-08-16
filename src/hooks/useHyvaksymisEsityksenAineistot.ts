import useSWR from "swr";
import { apiConfig } from "@services/api";
import { useRouter } from "next/router";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo } from "react";

export function useHyvaksymisEsityksenAineistot() {
  const api = useApi();
  const { query } = useRouter();
  const oid = typeof query.oid === "string" ? query.oid : undefined;
  const hash = typeof query.hash === "string" ? query.hash : undefined;

  const hyvEsLoader = useMemo(() => {
    return getHyvaksymisEsityksenAineistotLoader(api);
  }, [api]);

  const paramArray = useMemo(() => {
    return [apiConfig.listaaHyvaksymisEsityksenTiedostot.graphql, oid, hash];
  }, [hash, oid]);

  return useSWR(paramArray, hyvEsLoader);
}

const getHyvaksymisEsityksenAineistotLoader = (api: API) => async (_query: string, oid: string | undefined, hash: string | undefined) => {
  if (!oid || !hash) {
    return null;
  }
  return await api.listaaHyvaksymisEsityksenTiedostot(oid, { hash });
};
