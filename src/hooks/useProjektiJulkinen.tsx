import useSWR from "swr";
import { apiConfig, ProjektiJulkinen } from "@services/api";
import { useRouter } from "next/router";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo } from "react";

export function useProjektiJulkinen() {
  const router = useRouter();
  const api = useApi();

  const projektiLoader = useMemo(() => getProjektiLoader(api), [api]);

  if (router.asPath.startsWith("/yllapito")) {
    throw new Error("Inproper route for the use of useProjektiJulkinen hook");
  }
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  return useSWR([apiConfig.lataaProjekti.graphql, oid], projektiLoader, { revalidateOnReconnect: true, revalidateIfStale: true });
}

const getProjektiLoader =
  (api: API) =>
  async (_query: string, oid: string | undefined): Promise<ProjektiJulkinen | null> => {
    if (!oid) {
      return null;
    }
    return await api.lataaProjektiJulkinen(oid);
  };
