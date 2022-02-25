import useSWR from "swr";
import { api, apiConfig, ProjektiJulkinen } from "@services/api";

export function useProjektiJulkinen(oid?: string) {
  return useSWR<ProjektiJulkinen | undefined>([apiConfig.lataaProjekti.graphql, oid], projektiLoader);
}

async function projektiLoader(_: string, oid: string | undefined): Promise<ProjektiJulkinen | undefined> {
  if (!oid) {
    return;
  }
  return await api.lataaProjektiJulkinen(oid);
}
