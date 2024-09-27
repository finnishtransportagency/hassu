import useSWR from "swr";
import { apiConfig } from "@services/api";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo } from "react";

export function useSuomifiUser() {
  const api = useApi();
  const userLoader = useMemo(() => getUserLoader(api), [api]);
  return useSWR([apiConfig.nykyinenSuomifiKayttaja.graphql], userLoader);
}

export type RefreshStatus = {
  status: number;
  updated: string;
};

export function useRefreshToken() {
  const fetcher = (url: string): Promise<RefreshStatus> => fetch(url).then((r) => r.json());
  return useSWR("/api/refreshtoken", fetcher, { refreshInterval: 60 * 1000 * 3 });
}

const getUserLoader = (api: API) => async (_: string) => {
  return await api.getCurrentSuomifiUser();
};

export default useSuomifiUser;
