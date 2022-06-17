import useSWR from "swr";
import { api, apiConfig } from "@services/api";

export function useKirjaamoOsoitteet() {
  return useSWR([apiConfig.listKirjaamoOsoitteet.graphql], kirjaamoOsoitteetLoader);
}

async function kirjaamoOsoitteetLoader(_: string) {
  return await api.listKirjaamoOsoitteet();
}

export default useKirjaamoOsoitteet;
