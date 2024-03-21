import { TestiKomento, TestiKomentoVaihe } from "@services/api";
import { api } from "@services/api/permanentApi";

import { useRouter } from "next/router";
import { ParsedUrlQuery } from "querystring";
import React, { ReactElement, useEffect, useState } from "react";
import useApi from "src/hooks/useApi";
import { ProjektiTestCommandExecutor, TestAction } from "../../../../../common/testUtil.dev";

export default function Testikomento(): ReactElement {
  const [result, setResult] = useState<string>("");
  const router = useRouter();
  const api = useApi();

  useEffect(() => {
    runTestCommand(router.query)
      .then((action) => {
        setResult("OK");
        if (TestAction.MIGROI !== action) {
          setTimeout(() => {
            window.history.back();
          }, 2000);
        }
      })
      .catch((e) => {
        console.error(e);
        setResult(e.message);
      });
  }, [api, router.query]);
  return <p id="result">{result}</p>;
}

async function runTestCommand(query: ParsedUrlQuery) {
  let executor = new ProjektiTestCommandExecutor(query);

  await executor.onAjansiirto(async (_oid: string, days: string) => {
    console.log("onAjansiirto", days);
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.AJANSIIRTO,
      ajansiirtoPaivina: Number(days),
    });
  });

  await executor.onVuorovaikutusKierrosMenneisyyteen(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.AJANSIIRTO,
      ajansiirtoPaivina: 1,
      vaihe: TestiKomentoVaihe.VUOROVAIKUTUKSET,
    });
  });

  await executor.onNahtavillaoloMenneisyyteen(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.AJANSIIRTO,
      ajansiirtoPaivina: 1,
      vaihe: TestiKomentoVaihe.NAHTAVILLAOLO,
    });
  });

  await executor.onHyvaksymispaatosMenneisyyteen(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.AJANSIIRTO,
      ajansiirtoPaivina: 1,
      vaihe: TestiKomentoVaihe.HYVAKSYMISVAIHE,
    });
  });

  await executor.onHyvaksymispaatosVuosiMenneisyyteen(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.AJANSIIRTO,
      vaihe: TestiKomentoVaihe.HYVAKSYMISVAIHE,
      ajansiirtoPaivina: 367,
    });
  });

  await executor.onJatkopaatos1Menneisyyteen(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.AJANSIIRTO,
      ajansiirtoPaivina: 1,
      vaihe: TestiKomentoVaihe.JATKOPAATOS1VAIHE,
    });
  });

  await executor.onJatkopaatos1VuosiMenneisyyteen(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.AJANSIIRTO,
      vaihe: TestiKomentoVaihe.JATKOPAATOS1VAIHE,
      ajansiirtoPaivina: 367,
    });
  });

  await executor.onJatkopaatos2Menneisyyteen(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.AJANSIIRTO,
      ajansiirtoPaivina: 1,
      vaihe: TestiKomentoVaihe.JATKOPAATOS2VAIHE,
    });
  });

  await executor.onJatkopaatos2VuosiMenneisyyteen(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.AJANSIIRTO,
      vaihe: TestiKomentoVaihe.JATKOPAATOS2VAIHE,
      ajansiirtoPaivina: 367,
    });
  });

  await executor.onResetAloituskuulutus(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.RESET,
      vaihe: TestiKomentoVaihe.ALOITUSKUULUTUS,
    });
  });

  await executor.onResetSuunnittelu(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.RESET,
      vaihe: TestiKomentoVaihe.SUUNNITTELU,
    });
  });

  await executor.onResetVuorovaikutukset(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.RESET,
      vaihe: TestiKomentoVaihe.VUOROVAIKUTUKSET,
    });
  });

  await executor.onResetNahtavillaolo(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.RESET,
      vaihe: TestiKomentoVaihe.NAHTAVILLAOLO,
    });
  });

  await executor.onResetHyvaksymisvaihe(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.RESET,
      vaihe: TestiKomentoVaihe.HYVAKSYMISVAIHE,
    });
  });

  await executor.onResetJatkopaatos1vaihe(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.RESET,
      vaihe: TestiKomentoVaihe.JATKOPAATOS1VAIHE,
    });
  });

  await executor.onMigraatio(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.MIGRAATIO,
      migraatioTargetStatus: executor._targetStatus,
    });
  });

  await executor.onKaynnistaAsianhallintaSynkronointi(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.VIE_ASIANHALLINTAAN,
    });
  });
  return executor._action;
}
