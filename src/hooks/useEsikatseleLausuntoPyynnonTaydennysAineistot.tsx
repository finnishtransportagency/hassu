import useSWR from "swr";
import { LausuntoPyynnonTaydennysInput, apiConfig } from "@services/api";
import { useRouter } from "next/router";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useEffect, useMemo } from "react";

export function useEsikatseleLausuntoPyynnonTaydennysAineistot() {
  const api = useApi();
  const { query } = useRouter();
  const oid = typeof query.oid === "string" ? query.oid : undefined;
  const uuid = typeof query.uuid === "string" ? query.uuid : undefined;

  const lausuntoPyynnonTaydennysInput = useMemo(() => {
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

  const esikatseleLausuntoPyyntoTiedostoLoader = getEsikatseleLausuntoPyynnonTaydennysTiedostoLoader(api);

  return useSWR(
    [apiConfig.esikatseleLausuntoPyynnonTaydennysTiedostot.graphql, oid, lausuntoPyynnonTaydennysInput],
    esikatseleLausuntoPyyntoTiedostoLoader
  );
}

const getEsikatseleLausuntoPyynnonTaydennysTiedostoLoader =
  (api: API) => async (_query: string, oid: string, lausuntoPyyntoTaydennysInput: LausuntoPyynnonTaydennysInput) => {
    if (!oid || !lausuntoPyyntoTaydennysInput) {
      return null;
    }
    return await api.esikatseleLausuntoPyynnonTaydennysTiedostot(oid, lausuntoPyyntoTaydennysInput);
  };
