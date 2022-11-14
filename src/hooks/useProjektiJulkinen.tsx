import useSWR from "swr";
import { api, apiConfig, ProjektiJulkinen } from "@services/api";
import { useRouter } from "next/router";

export function useProjektiJulkinen() {
  const router = useRouter();
  if (router.asPath.startsWith("/yllapito")) {
    throw new Error("Inproper route for the use of useProjektiJulkinen hook");
  }
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  return useSWR([apiConfig.lataaProjekti.graphql, oid], projektiLoader, { revalidateOnReconnect: true, revalidateIfStale: true });
}

async function projektiLoader(_query: string, oid: string | undefined): Promise<ProjektiJulkinen | null> {
  if (!oid) {
    return null;
  }
  return await api.lataaProjektiJulkinen(oid);
}
