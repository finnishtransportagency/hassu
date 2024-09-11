import useSWR from "swr";
import { apiConfig } from "@services/api";
import { useRouter } from "next/router";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";

export function useEsikatseleHyvaksyttavaHyvaksymisEsitys() {
  const api = useApi();
  const { query } = useRouter();
  const oid = typeof query.oid === "string" ? query.oid : undefined;

  const esikatseleHyvaksymisEsitysLoader = getEsikatseleHyvaksymisEsitysLoader(api);

  return useSWR([apiConfig.esikatseleHyvaksyttavaHyvaksymisEsityksenTiedostot.graphql, oid], esikatseleHyvaksymisEsitysLoader);
}

const getEsikatseleHyvaksymisEsitysLoader = (api: API) => async (_query: string, oid: string) => {
  if (!oid) {
    return null;
  }
  return await api.esikatseleHyvaksyttavaHyvaksymisEsityksenTiedostot(oid);
};
