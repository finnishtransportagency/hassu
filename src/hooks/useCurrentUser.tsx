import useSWR from "swr";
import { api, apiConfig } from "@services/api";
import { isEqual, omit } from "lodash";

export function useCurrentUser() {
  return useSWR([apiConfig.nykyinenKayttaja.graphql], userLoader, {
    compare: (a, b) => isEqual(omit(a, "keksit"), omit(b, "keksit")),
  });
}

async function userLoader(_: string) {
  const kayttaja = await api.getCurrentUser();
  if (kayttaja?.keksit) {
    kayttaja.keksit.forEach((cookie) => {
      document.cookie = cookie;
    });
  }
  return kayttaja;
}

export default useCurrentUser;
