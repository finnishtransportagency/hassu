import { NextApiRequest, NextApiResponse } from "next";
import { ProjektiTestCommandExecutor } from "../../../../common/testUtil.dev";
import { TestiKomento, TestiKomentoVaihe } from "../../../../common/graphql/apiModel";
import { api } from "@services/api/permanentApi";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let executor = new ProjektiTestCommandExecutor(req.query);

  await executor.onAjansiirto(async (_oid:string, days: number) => {
    console.log("onAjansiirto", days);
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.AJANSIIRTO,
      ajansiirtoPaivina: days,
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
      ajansiirtoPaivina: 365,
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
      ajansiirtoPaivina: 365,
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
    });
  });

  await executor.onKaynnistaAsianhallintaSynkronointi(async () => {
    await api.suoritaTestiKomento({
      oid: executor.getOid(),
      tyyppi: TestiKomento.VIE_ASIANHALLINTAAN,
    });
  });
  //
  // text/html jotta cypress toimii paremmin
  res.setHeader("Content-Type", "text/html");
  res.send("<script>history.go(-1);</script>");
}
