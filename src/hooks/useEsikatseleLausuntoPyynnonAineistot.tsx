import useSWR from "swr";
import { LausuntoPyyntoInput, apiConfig } from "@services/api";
import { useRouter } from "next/router";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo } from "react";
import { PreviewExpiredError } from "common/error/PreviewExpiredError";

export function useEsikatseleLausuntoPyynnonAineistot() {
  const api = useApi();
  const { query } = useRouter();
  const oid = typeof query.oid === "string" ? query.oid : undefined;
  const uuid = typeof query.uuid === "string" ? query.uuid : undefined;

  const lausuntoPyyntoInput = useMemo(() => {
    let parsed;
    try {
      if (typeof window !== "undefined") {
        const localStorageData = localStorage.getItem(`lausuntoPyyntoInput.${uuid}`);
        if (localStorageData) {
          parsed = JSON.parse(localStorageData) as LausuntoPyyntoInput;
        } else {
          return new PreviewExpiredError("Tarvittu data esikatselua varten on unohtunut.", undefined);
        }
      }
    } catch (e) {
      throw new Error("Esikatselua varten tallennettu lausuntopyyntö-data on korruptoitunut");
    }
    return parsed;
  }, [uuid]);

  const esikatseleLausuntoPyyntoTiedostoLoader = getEsikatseleLausuntoPyyntoTiedostoLoader(api);

  const data = useSWR(
    [apiConfig.esikatseleLausuntoPyynnonTiedostot.graphql, oid, lausuntoPyyntoInput],
    esikatseleLausuntoPyyntoTiedostoLoader
  );
  return lausuntoPyyntoInput instanceof PreviewExpiredError ? { data: lausuntoPyyntoInput } : data;
}

const getEsikatseleLausuntoPyyntoTiedostoLoader =
  (api: API) => async (_query: string, oid: string, lausuntoPyyntoInput: LausuntoPyyntoInput | PreviewExpiredError) => {
    if (!oid || !lausuntoPyyntoInput || lausuntoPyyntoInput instanceof PreviewExpiredError) {
      return null;
    }
    return await api.esikatseleLausuntoPyynnonTiedostot(oid, lausuntoPyyntoInput);
  };
