import useSWR from "swr";
import { LausuntoPyynnonTaydennysInput, apiConfig } from "@services/api";
import { useRouter } from "next/router";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useEffect, useMemo } from "react";
import { PreviewExpiredError } from "common/error/PreviewExpiredError";

export function useEsikatseleLausuntoPyynnonTaydennysAineistot() {
  const api = useApi();
  const { query } = useRouter();
  const oid = typeof query.oid === "string" ? query.oid : undefined;
  const uuid = typeof query.uuid === "string" ? query.uuid : undefined;

  const lausuntoPyynnonTaydennysInput = useMemo(() => {
    let parsed;
    try {
      if (typeof window !== "undefined") {
        const localStorageData = localStorage.getItem(`lausuntoPyyntoInput.${uuid}`);
        if (localStorageData) {
          parsed = JSON.parse(localStorageData) as LausuntoPyynnonTaydennysInput;
        } else {
          return new PreviewExpiredError("Tarvittu data esikatselua varten on unohtunut.", undefined);
        }
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

  const esikatseleLausuntoPyyntoTiedostoLoader = getEsikatseleLausuntoPyynnonTaydennysTiedostoLoader(api);

  const data = useSWR(
    [apiConfig.esikatseleLausuntoPyynnonTaydennysTiedostot.graphql, oid, lausuntoPyynnonTaydennysInput],
    esikatseleLausuntoPyyntoTiedostoLoader
  );
  return lausuntoPyynnonTaydennysInput instanceof PreviewExpiredError ? { data: lausuntoPyynnonTaydennysInput } : data;
}

const getEsikatseleLausuntoPyynnonTaydennysTiedostoLoader =
  (api: API) => async (_query: string, oid: string, lausuntoPyyntoTaydennysInput: LausuntoPyynnonTaydennysInput) => {
    if (!oid || !lausuntoPyyntoTaydennysInput) {
      return null;
    }
    return await api.esikatseleLausuntoPyynnonTaydennysTiedostot(oid, lausuntoPyyntoTaydennysInput);
  };
