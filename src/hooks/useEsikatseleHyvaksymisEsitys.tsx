import useSWR from "swr";
import { TallennaHyvaksymisEsitysInput, apiConfig } from "@services/api";
import { useRouter } from "next/router";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo } from "react";
import { PreviewExpiredError } from "common/error/PreviewExpiredError";

export function useEsikatseleHyvaksymisEsitys() {
  const api = useApi();
  const { query } = useRouter();
  const oid = typeof query.oid === "string" ? query.oid : undefined;
  const hyvaksymisEsitysInput = useMemo(() => {
    let parsed;
    try {
      if (typeof window !== "undefined") {
        const localStorageData = localStorage.getItem(`tallennaHyvaksymisEsitysInput`);
        if (localStorageData) {
          parsed = JSON.parse(localStorageData) as TallennaHyvaksymisEsitysInput;
        } else {
          return new PreviewExpiredError("Tarvittu data esikatselua varten on unohtunut.", undefined);
        }
      }
    } catch (e) {
      throw new Error("Esikatselua varten tallennettu hyväksymisesitys-data on korruptoitunut");
    }
    return parsed;
  }, []);

  const esikatseleHyvaksymisEsitysLoader = getEsikatseleHyvaksymisEsitysLoader(api);

  const data = useSWR([apiConfig.esikatseleLausuntoPyynnonTiedostot.graphql, oid, hyvaksymisEsitysInput], esikatseleHyvaksymisEsitysLoader);
  return hyvaksymisEsitysInput instanceof PreviewExpiredError ? { data: hyvaksymisEsitysInput } : data;
}

const getEsikatseleHyvaksymisEsitysLoader =
  (api: API) => async (_query: string, oid: string, hyvaksymisEsitysInput: TallennaHyvaksymisEsitysInput | PreviewExpiredError) => {
    if (!oid || !hyvaksymisEsitysInput || hyvaksymisEsitysInput instanceof PreviewExpiredError) {
      return null;
    }
    return await api.esikatseleHyvaksymisEsityksenTiedostot(oid, hyvaksymisEsitysInput.muokattavaHyvaksymisEsitys);
  };
