import { apiConfig, TestiKomento, TestiKomentoVaihe } from "@services/api";
import { useRouter } from "next/router";
import { ParsedUrlQuery } from "querystring";
import React, { ReactElement, useEffect, useMemo, useState } from "react";
import useApi from "src/hooks/useApi";
import { ProjektiTestCommandExecutor, TestAction } from "../../../../../common/testUtil.dev";
import { API } from "@services/api/commonApi";
import useSWR from "swr";

export default function Testikomento(): ReactElement {
  const [result, setResult] = useState<string>("");
  const api = useApi();
  const router = useRouter();
  const commandLoader = useMemo(() => testCommandExecutor(api), [api]);
  const { data } = useSWR([apiConfig.suoritaTestiKomento.graphql, router.query], commandLoader);
  useEffect(() => {
    setResult(data?.result ?? "Komentoa suoritetaan...");
    if (data?.action && TestAction.MIGROI !== data.action) {
      setTimeout(() => {
        window.history.back();
      }, 2000);
    }
  }, [data]);
  return <p id="result">{result}</p>;
}

const testCommandExecutor = (api: API) => async (_query: string, routerQuery: ParsedUrlQuery) => {
  let executor = new ProjektiTestCommandExecutor(routerQuery);
  if (!executor.getOid()) {
    return null;
  }
  let tyyppi: TestiKomento | undefined;
  let vaihe: TestiKomentoVaihe | undefined;
  let ajansiirtoPaivina: number | undefined;
  let migraatioTargetStatus: string | undefined;
  switch (executor._action) {
    case TestAction.MIGROI:
      tyyppi = TestiKomento.MIGRAATIO;
      migraatioTargetStatus = executor._targetStatus;
      break;
    case TestAction.RESET_ALOITUSKUULUTUS:
      tyyppi = TestiKomento.RESET;
      vaihe = TestiKomentoVaihe.ALOITUSKUULUTUS;
      break;
    case TestAction.RESET_SUUNNITTELU:
      tyyppi = TestiKomento.RESET;
      vaihe = TestiKomentoVaihe.SUUNNITTELU;
      break;
    case TestAction.RESET_NAHTAVILLAOLO:
      tyyppi = TestiKomento.RESET;
      vaihe = TestiKomentoVaihe.NAHTAVILLAOLO;
      break;
    case TestAction.RESET_VUOROVAIKUTUKSET:
      tyyppi = TestiKomento.RESET;
      vaihe = TestiKomentoVaihe.VUOROVAIKUTUKSET;
      break;
    case TestAction.RESET_JATKOPAATOS1VAIHE:
      tyyppi = TestiKomento.RESET;
      vaihe = TestiKomentoVaihe.JATKOPAATOS1VAIHE;
      break;
    case TestAction.RESET_HYVAKSYMISVAIHE:
      tyyppi = TestiKomento.RESET;
      vaihe = TestiKomentoVaihe.HYVAKSYMISVAIHE;
      break;
    case TestAction.KAYNNISTA_ASIANHALLINTA_SYNKRONOINTI:
      tyyppi = TestiKomento.VIE_ASIANHALLINTAAN;
      break;
    case TestAction.AJANSIIRTO:
      tyyppi = TestiKomento.AJANSIIRTO;
      ajansiirtoPaivina = Number(executor._days);
      break;
    case TestAction.VUOROVAIKUTUSKIERROS_MENNEISYYTEEN:
      tyyppi = TestiKomento.AJANSIIRTO;
      vaihe = TestiKomentoVaihe.VUOROVAIKUTUKSET;
      ajansiirtoPaivina = 1;
      break;
    case TestAction.NAHTAVILLAOLO_MENNEISYYTEEN:
      tyyppi = TestiKomento.AJANSIIRTO;
      vaihe = TestiKomentoVaihe.NAHTAVILLAOLO;
      ajansiirtoPaivina = 1;
      break;
    case TestAction.HYVAKSYMISPAATOS_MENNEISYYTEEN:
      tyyppi = TestiKomento.AJANSIIRTO;
      vaihe = TestiKomentoVaihe.HYVAKSYMISVAIHE;
      ajansiirtoPaivina = 1;
      break;
    case TestAction.JATKOPAATOS1_MENNEISYYTEEN:
      tyyppi = TestiKomento.AJANSIIRTO;
      vaihe = TestiKomentoVaihe.JATKOPAATOS1VAIHE;
      ajansiirtoPaivina = 1;
      break;
    case TestAction.JATKOPAATOS2_MENNEISYYTEEN:
      tyyppi = TestiKomento.AJANSIIRTO;
      vaihe = TestiKomentoVaihe.JATKOPAATOS2VAIHE;
      ajansiirtoPaivina = 1;
      break;
    case TestAction.HYVAKSYMISPAATOS_VUOSI_MENNEISYYTEEN:
      tyyppi = TestiKomento.AJANSIIRTO;
      vaihe = TestiKomentoVaihe.HYVAKSYMISVAIHE;
      ajansiirtoPaivina = 367;
      break;
    case TestAction.JATKOPAATOS1_VUOSI_MENNEISYYTEEN:
      tyyppi = TestiKomento.AJANSIIRTO;
      vaihe = TestiKomentoVaihe.JATKOPAATOS1VAIHE;
      ajansiirtoPaivina = 367;
      break;
    case TestAction.JATKOPAATOS2_VUOSI_MENNEISYYTEEN:
      tyyppi = TestiKomento.AJANSIIRTO;
      vaihe = TestiKomentoVaihe.JATKOPAATOS2VAIHE;
      ajansiirtoPaivina = 367;
      break;
  }
  let result;
  try {
    if (tyyppi) {
      await api.suoritaTestiKomento({
        oid: executor.getOid(),
        tyyppi,
        ajansiirtoPaivina,
        migraatioTargetStatus,
        vaihe,
      });
      result = "OK";
    } else {
      result = "Tuntematon komento";
    }
  } catch (e) {
    result = e instanceof Error ? e.message : "Tuntematon virhe";
  }
  return { result, action: executor._action };
};

export async function getServerSideProps() {
  if (process.env.ENVIRONMENT === "prod") {
    return { notFound: true };
  }
  return { props: {} };
}
