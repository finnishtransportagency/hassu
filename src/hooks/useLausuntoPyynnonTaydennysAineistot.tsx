import useSWR from "swr";
import { apiConfig } from "@services/api";
import { useRouter } from "next/router";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo } from "react";

export function useLausuntoPyynnonTaydennysAineistot() {
  const api = useApi();
  const { query } = useRouter();
  const oid = typeof query.oid === "string" ? query.oid : undefined;
  const hash = typeof query.hash === "string" ? query.hash : undefined;
  const uuid = typeof query.uuid === "string" ? query.uuid : undefined;

  const lausuntoPyynnonTaydennysTiedostoLoader = useMemo(() => getLausuntoPyynnonTaydennysTiedostoLoader(api), [api]);

  return useSWR([apiConfig.listaaLisaAineisto.graphql, oid, hash, uuid], lausuntoPyynnonTaydennysTiedostoLoader);
}

const getLausuntoPyynnonTaydennysTiedostoLoader =
  (api: API) => async (_query: string, oid: string | undefined, hash: string | undefined, uuid: string | undefined) => {
    if (!oid || !hash || !uuid) {
      return null;
    }
    return await api.listaaLausuntoPyynnonTaydennyksenTiedostot(oid, { hash, lausuntoPyynnonTaydennysUuid: uuid });
  };
