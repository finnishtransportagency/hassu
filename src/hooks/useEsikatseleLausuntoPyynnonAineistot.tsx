import useSWR from "swr";
import { LausuntoPyyntoInput, apiConfig } from "@services/api";
import { useRouter } from "next/router";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useEffect, useMemo } from "react";
import { PreviewExpiredError } from "common/error/PreviewExpiredError";

export function useEsikatseleLausuntoPyynnonAineistot() {
  const api = useApi();
  const { query } = useRouter();
  const oid = typeof query.oid === "string" ? query.oid : undefined;
  const uuid = typeof query.uuid === "string" ? query.uuid : undefined;

  const lausuntoPyyntoInput = useMemo(() => {
    let parsed;
    const localStorageData = localStorage.getItem(`lausuntoPyyntoInput.${uuid}`);
    try {
      if (localStorageData) {
        parsed = JSON.parse(localStorageData) as LausuntoPyyntoInput;
      } else {
        return new PreviewExpiredError("Tarvittu data esikatselua varten on unohtunut.", undefined);
      }
    } catch (e) {
      throw new Error("Esikatselua varten tallennettu lausuntopyyntö-data on korruptoitunut");
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

  const data = useSWR(
    [apiConfig.esikatseleLausuntoPyynnonTiedostot.graphql, oid, lausuntoPyyntoInput],
    esikatseleLausuntoPyyntoTiedostoLoader
  );
  return lausuntoPyyntoInput instanceof PreviewExpiredError ? { data: lausuntoPyyntoInput } : data;
}

const getEsikatseleLausuntoPyyntoTiedostoLoader =
  (api: API) => async (_query: string, oid: string, lausuntoPyyntoInput: LausuntoPyyntoInput) => {
    if (!oid || !lausuntoPyyntoInput) {
      return null;
    }
    return await api.esikatseleLausuntoPyynnonTiedostot(oid, lausuntoPyyntoInput);
  };
