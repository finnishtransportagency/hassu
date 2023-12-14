import useSWR from "swr";
import { apiConfig } from "@services/api";
import { useRouter } from "next/router";
import useApi from "./useApi";
import { API } from "@services/api/commonApi";
import { useMemo } from "react";

export function useLisaAineisto() {
  const api = useApi();
  const { query } = useRouter();
  const oid = typeof query.oid === "string" ? query.oid : undefined;
  const hash = typeof query.hash === "string" ? query.hash : undefined;
  const nahtavillaoloVaiheId = typeof query.id === "string" && !Number.isNaN(Number(query.id)) ? parseInt(query.id) : undefined;
  const uuid = useMemo(() => {
    return typeof query.uuid === "string" ? query.uuid : undefined;
  }, [query.uuid]);
  const poistumisPaiva = typeof query.poistumisPaiva === "string" ? query.poistumisPaiva : undefined;

  const lisaAineistoLoader = useMemo(() => {
    if (uuid) {
      return getLausuntoPyyntoTiedostoLoader(api);
    } else {
      return getLisaAineistoLoader(api);
    }
  }, [api, uuid]);

  const paramArray = useMemo(() => {
    if (uuid) {
      return [apiConfig.listaaLausuntoPyynnonTiedostot.graphql, oid, hash, uuid];
    } else {
      return [apiConfig.listaaLisaAineisto.graphql, oid, hash, nahtavillaoloVaiheId, poistumisPaiva];
    }
  }, [hash, nahtavillaoloVaiheId, oid, poistumisPaiva, uuid]);

  return useSWR(paramArray, lisaAineistoLoader);
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

const getLausuntoPyyntoTiedostoLoader =
  (api: API) => async (_query: string, oid: string | undefined, hash: string | undefined, uuid: string | undefined) => {
    if (!oid || !hash || !uuid) {
      return null;
    }
    return await api.listaaLausuntoPyynnonTiedostot(oid, { hash, lausuntoPyyntoUuid: uuid });
  };
