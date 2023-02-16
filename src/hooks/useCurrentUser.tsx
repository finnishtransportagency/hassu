import useSWR from "swr";
import { apiConfig } from "@services/api";
import { isEqual, omit } from "lodash";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo } from "react";

export function useCurrentUser() {
  const { api } = useApi();

  const userLoader = useMemo(() => getUserLoader(api), [api]);

  return useSWR([apiConfig.nykyinenKayttaja.graphql], userLoader, {
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
