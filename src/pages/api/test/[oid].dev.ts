import { NextApiRequest, NextApiResponse } from "next";
import { authenticateAndLoadProjekti } from "../../../util/apiUtil.dev";
import { ProjektiTestCommandExecutor } from "../../../../common/testUtil.dev";
import { projektiDatabase } from "../../../../backend/src/database/projektiDatabase";
import dayjs from "dayjs";
import { DBProjekti } from "../../../../backend/src/database/model";
import { testProjektiDatabase } from "../../../../backend/src/database/testProjektiDatabase";
import { importProjekti, TargetStatuses } from "../../../../backend/src/migraatio/migration";
import { NykyinenKayttaja } from "../../../../common/graphql/apiModel";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const dbProjekti = await authenticateAndLoadProjekti(req, res);

  let executor = new ProjektiTestCommandExecutor(req.query);

  function requireProjekti() {
    if (!dbProjekti) {
      res.send("Projektia ei löydy.");
    }
  }

  await executor.onNahtavillaoloMenneisyyteen(async () => {
    requireProjekti();
    if (dbProjekti?.nahtavillaoloVaiheJulkaisut) {
      for (const julkaisu of dbProjekti.nahtavillaoloVaiheJulkaisut) {
        julkaisu.kuulutusVaihePaattyyPaiva = "2022-01-01";
        await projektiDatabase.nahtavillaoloVaiheJulkaisut.update(dbProjekti, julkaisu);
      }
    }
  });

  await executor.onHyvaksymispaatosMenneisyyteen(async () => {
    requireProjekti();
    if (dbProjekti?.hyvaksymisPaatosVaiheJulkaisut) {
      for (const julkaisu of dbProjekti.hyvaksymisPaatosVaiheJulkaisut) {
        let yesterday = dayjs().add(-1, "day").format("YYYY-MM-DD");
        julkaisu.kuulutusPaiva = yesterday;
        julkaisu.kuulutusVaihePaattyyPaiva = yesterday;
        await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.update(dbProjekti, julkaisu);
      }
    }
  });

  await executor.onHyvaksymispaatosVuosiMenneisyyteen(async () => {
    requireProjekti();
    if (dbProjekti?.hyvaksymisPaatosVaiheJulkaisut) {
      for (const julkaisu of dbProjekti.hyvaksymisPaatosVaiheJulkaisut) {
        let yearAgo = dayjs().add(-1, "year").add(-1, "day").format("YYYY-MM-DD");
        julkaisu.kuulutusPaiva = yearAgo;
        julkaisu.kuulutusVaihePaattyyPaiva = yearAgo;
        await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.update(dbProjekti, julkaisu);
      }
    }
  });

  const hyvaksymisPaatosVaiheFields: Partial<DBProjekti> = {
    hyvaksymisPaatosVaihe: null,
    hyvaksymisPaatosVaiheJulkaisut: null,
  };

  const nahtavillaoloVaiheFields: Partial<DBProjekti> = {
    nahtavillaoloVaihe: null,
    nahtavillaoloVaiheJulkaisut: null,
    ...hyvaksymisPaatosVaiheFields,
  };

  const vuorovaikutusFields: Partial<DBProjekti> = {
    vuorovaikutukset: null,
    ...nahtavillaoloVaiheFields,
  };

  const suunnitteluVaiheFields: Partial<DBProjekti> = {
    suunnitteluVaihe: null,
    ...vuorovaikutusFields,
  };

  await executor.onResetSuunnittelu(async (oid: string) => {
    requireProjekti();
    await testProjektiDatabase.saveProjekti({
      oid,
      ...suunnitteluVaiheFields,
    });
  });

  await executor.onResetVuorovaikutukset(async (oid: string) => {
    requireProjekti();
    await testProjektiDatabase.saveProjekti({
      oid,
      ...vuorovaikutusFields,
    });
  });

  await executor.onResetNahtavillaolo(async (oid: string) => {
    requireProjekti();
    await testProjektiDatabase.saveProjekti({
      oid,
      ...nahtavillaoloVaiheFields,
    });
  });

  await executor.onResetHyvaksymisvaihe(async (oid: string) => {
    requireProjekti();
    await testProjektiDatabase.saveProjekti({
      oid,
      kasittelynTila: null,
      ...hyvaksymisPaatosVaiheFields,
    });
  });

  await executor.onMigraatio(
    async (oid: string, targetStatus: TargetStatuses, hyvaksymispaatosPaivamaara?: string, hyvaksymispaatosAsianumero?: string) => {
      if (!targetStatus) {
        throw new Error("targetStatus-parametri puuttuu");
      }
      const kayttaja: NykyinenKayttaja = {
        __typename: "NykyinenKayttaja",
        etunimi: "migraatio",
        sukunimi: "migraatio",
        roolit: ["hassu_admin"],
        uid: "migraatio",
      };

      await importProjekti({
        oid: oid,
        kayttaja,
        targetStatus: targetStatus,
        hyvaksymispaatosPaivamaara: dayjs(hyvaksymispaatosPaivamaara).toDate(),
        hyvaksymispaatosAsianumero: hyvaksymispaatosAsianumero,
      });
    }
  );

  // text/html jotta cypress toimii paremmin
  res.setHeader("Content-Type", "text/html");
  if (dbProjekti) {
    res.send("<script>history.go(-1);</script>");
  } else {
    res.send("OK");
  }
}
