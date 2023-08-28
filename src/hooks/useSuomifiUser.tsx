import useSWR from "swr";
import { apiConfig } from "@services/api";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo, useState } from "react";

export function useSuomifiUser() {
  const api = useApi();
  const interval5min = 1000 * 60 * 5;
  const [refreshInterval, setRefreshInterval] = useState<number | undefined>();

  const userLoader = useMemo(() => getUserLoader(api), [api]);

  const swrResponse = useSWR([apiConfig.nykyinenSuomifiKayttaja.graphql], userLoader, {
    refreshInterval: refreshInterval?.valueOf(),
  });

  // Päivitetään tiedot joka latauksella jos suomi.fi-integraatio on käytössä.
  // Muuten päivitetään 5 minuutin välein.
  if (!swrResponse.isValidating) {
    if (swrResponse.data?.suomifiEnabled) {
      if (refreshInterval !== undefined) {
        setRefreshInterval(undefined);
        console.log("Suomi.fi-integraatio on käytössä. Päivitetään käyttäjätiedot joka latauksella.");
      }
    } else {
      if (refreshInterval === undefined) {
        setRefreshInterval(interval5min);
        console.log("Suomi.fi-integraatio ei ole käytössä. Päivitetään käyttäjätiedot 5 minuutin välein.");
      }
    }
  }
  return swrResponse;
}

const getUserLoader = (api: API) => async (_: string) => {
  return await api.getCurrentSuomifiUser();
};

export default useSuomifiUser;
