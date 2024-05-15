import { NykyinenKayttaja, apiConfig } from "@services/api";
import { useCallback } from "react";
import useApi from "./useApi";
import useSWR from "swr";
import { useRouter } from "next/router";
import useCurrentUser from "./useCurrentUser";

export default function useHyvaksymisEsitys() {
  const api = useApi();
  const router = useRouter();
  const oid = router.query.oid;
  const { data: kayttaja } = useCurrentUser();
  const hyvaksymisEsitysLoader = useCallback(
    async (_query: string, oid: string | undefined, kayttaja: NykyinenKayttaja | undefined) => {
      if (!oid) {
        return null;
      }
      if (!kayttaja) {
        return null;
      }
      return await api.haeHyvaksymisEsityksenTiedot(oid);
    },
    [api]
  );
  return useSWR([apiConfig.haeHyvaksymisEsityksenTiedot.graphql, oid, kayttaja], hyvaksymisEsitysLoader);
}
