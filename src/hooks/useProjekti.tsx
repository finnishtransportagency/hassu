import useSWR from "swr";
import { api, apiConfig } from "@services/api";

export function useProjekti(oid?: string) {
  return useSWR([apiConfig.lataaProjekti.graphql, oid], projektiLoader);
}

async function projektiLoader(_: string, oid?: string) {
  if (!oid) {
    return null;
  }
  return await api.lataaProjekti(oid);
}

export default useProjekti;
