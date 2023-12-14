import useSWR from "swr";
import { LausuntoPyyntoInput, apiConfig } from "@services/api";
import { useRouter } from "next/router";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useEffect, useMemo } from "react";

export function useEsikatseleLausuntoPyynnonAineistot() {
  const api = useApi();
  const { query } = useRouter();
  const oid = typeof query.oid === "string" ? query.oid : undefined;
  const uuid = typeof query.uuid === "string" ? query.uuid : undefined;

  const lausuntoPyyntoInput = useMemo(() => {
    let parsed;
    try {
      parsed = JSON.parse(localStorage.getItem(`lausuntoPyyntoInput.${uuid}`) ?? "");
    } catch (e) {
      console.log(`Parsing input saved in localstorage at lausuntoPyyntoInput.${uuid} failed`, e);
    }
    return parsed;
  }, [uuid]);

  useEffect(() => {
    const listener = () => {
      localStorage.removeItem(`lausuntoPyyntoInput.${uuid}`);
    };
    window.addEventListener("beforeunload", listener);
    return () => {
      window.removeEventListener("beforeunload", listener);
    };
  }, [uuid]);

  const esikatseleLausuntoPyyntoTiedostoLoader = getEsikatseleLausuntoPyyntoTiedostoLoader(api);

  return useSWR([apiConfig.esikatseleLausuntoPyynnonTiedostot.graphql, oid, lausuntoPyyntoInput], esikatseleLausuntoPyyntoTiedostoLoader);
}

const getEsikatseleLausuntoPyyntoTiedostoLoader =
  (api: API) => async (_query: string, oid: string, lausuntoPyyntoInput: LausuntoPyyntoInput) => {
    if (!oid || !lausuntoPyyntoInput) {
      return null;
    }
    return await api.esikatseleLausuntoPyynnonTiedostot(oid, lausuntoPyyntoInput);
  };
