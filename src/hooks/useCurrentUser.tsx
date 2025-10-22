import useSWR from "swr";
import { apiConfig } from "@services/api";
import omit from "lodash/omit";
import isEqual from "lodash/isEqual";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo } from "react";

export function useCurrentUser(enabled = true) {
  const api = useApi();

  const userLoader = useMemo(() => getUserLoader(api), [api]);

  return useSWR(enabled ? [apiConfig.nykyinenKayttaja.graphql] : null, userLoader, {
    refreshInterval: 1000 * 60 * 15, // Päivitä vartin välein
    compare: (a, b) => isEqual(omit(a, "keksit"), omit(b, "keksit")),
  });
}

const getUserLoader = (api: API) => async (_: string) => {
  const kayttaja = await api.getCurrentUser();
  if (kayttaja?.keksit) {
    kayttaja.keksit.forEach((cookie) => {
      document.cookie = cookie;
    });
  }
  return kayttaja;
};

export default useCurrentUser;
