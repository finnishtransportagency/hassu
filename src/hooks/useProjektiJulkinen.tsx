import useSWR from "swr";
import { apiConfig, Kieli, ProjektiJulkinen } from "@services/api";
import { useRouter } from "next/router";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo } from "react";
import useTranslation from "next-translate/useTranslation";

function langToKieli(lang: string): Kieli {
  if (lang === "sv") {
    return Kieli.RUOTSI;
  }
  if (lang === "fi") {
    return Kieli.SUOMI;
  }
  return Kieli.SAAME;
}

export function useProjektiJulkinen() {
  const router = useRouter();
  const api = useApi();
  const { lang } = useTranslation();

  const projektiLoader = useMemo(() => getProjektiLoader(api), [api]);

  if (router.asPath.startsWith("/yllapito")) {
    throw new Error("Inproper route for the use of useProjektiJulkinen hook");
  }
  const oid = typeof router.query.oid === "string" ? router.query.oid : undefined;
  return useSWR([apiConfig.lataaProjekti.graphql, oid, langToKieli(lang)], projektiLoader, {
    revalidateOnReconnect: true,
    revalidateIfStale: true,
  });
}

const getProjektiLoader =
  (api: API) =>
  async (_query: string, oid: string | undefined, kieli: Kieli): Promise<ProjektiJulkinen | null> => {
    if (!oid) {
      return null;
    }
    return await api.lataaProjektiJulkinen(oid, kieli);
  };
