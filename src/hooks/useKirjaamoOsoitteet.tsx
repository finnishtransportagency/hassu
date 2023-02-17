import useSWR from "swr";
import { apiConfig } from "@services/api";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo } from "react";

export function useKirjaamoOsoitteet() {
  const api = useApi();

  const kirjaamoOsoitteetLoader = useMemo(() => getKirjaamoOsoitteetLoader(api), [api]);
  return useSWR([apiConfig.listKirjaamoOsoitteet.graphql], kirjaamoOsoitteetLoader);
}

const getKirjaamoOsoitteetLoader = (api: API) => async (_: string) => {
  return await api.listKirjaamoOsoitteet();
};

export default useKirjaamoOsoitteet;
