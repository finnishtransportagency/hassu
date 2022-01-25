import useSWR from "swr";
import { api, apiConfig } from "@services/api";

export function useCurrentUser() {
  return useSWR([apiConfig.nykyinenKayttaja.graphql], userLoader);
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
