import useSWR from "swr";
import { apiConfig } from "@services/api";
import { useRouter } from "next/router";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo } from "react";

export function useEnnakkoNeuvottelunAineistot() {
  const api = useApi();
  const { query } = useRouter();
  const oid = typeof query.oid === "string" ? query.oid : undefined;
  const hash = typeof query.hash === "string" ? query.hash : undefined;

  const loader = useMemo(() => {
    return getEnnakkoNeuvottelunAineistotLoader(api);
  }, [api]);

  const paramArray = useMemo(() => {
    return [apiConfig.listaaHyvaksymisEsityksenTiedostot.graphql, oid, hash];
  }, [hash, oid]);

  return useSWR(paramArray, loader);
}

const getEnnakkoNeuvottelunAineistotLoader = (api: API) => async (_query: string, oid: string | undefined, hash: string | undefined) => {
  if (!oid || !hash) {
    return null;
  }
  return await api.listaaEnnakkoNeuvottelunTiedostot(oid, hash);
};
