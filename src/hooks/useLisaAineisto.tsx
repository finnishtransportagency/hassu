import useSWR from "swr";
import { apiConfig } from "@services/api";
import { useRouter } from "next/router";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo } from "react";

export function useLisaAineisto() {
  const { api } = useApi();
  const { query } = useRouter();
  const oid = typeof query.oid === "string" ? query.oid : undefined;
  const hash = typeof query.hash === "string" ? query.hash : undefined;
  const nahtavillaoloVaiheId = typeof query.id === "string" && !Number.isNaN(Number(query.id)) ? parseInt(query.id) : undefined;
  const poistumisPaiva = typeof query.poistumisPaiva === "string" ? query.poistumisPaiva : undefined;

  const lisaAineistoLoader = useMemo(() => getLisaAineistoLoader(api), [api]);

  return useSWR([apiConfig.listaaLisaAineisto.graphql, oid, hash, nahtavillaoloVaiheId, poistumisPaiva], lisaAineistoLoader);
}

const getLisaAineistoLoader =
  (api: API) =>
  async (
    _query: string,
    oid: string | undefined,
    hash: string | undefined,
    nahtavillaoloVaiheId: number | undefined,
    poistumisPaiva: string | undefined
  ) => {
    if (!oid || !hash || !nahtavillaoloVaiheId || !poistumisPaiva) {
      return null;
    }
    return await api.listaaLisaAineisto(oid, { hash, nahtavillaoloVaiheId, poistumisPaiva });
  };
