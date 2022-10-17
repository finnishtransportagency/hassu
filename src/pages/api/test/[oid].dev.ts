import { NextApiRequest, NextApiResponse } from "next";
import { authenticateAndLoadProjekti } from "../../../util/apiUtil.dev";
import { ProjektiTestCommandExecutor } from "../../../../common/testUtil.dev";
import { projektiDatabase } from "../../../../backend/src/database/projektiDatabase";
import dayjs from "dayjs";
import { DBProjekti } from "../../../../backend/src/database/model";
import { testProjektiDatabase } from "../../../../backend/src/database/testProjektiDatabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const dbProjekti = await authenticateAndLoadProjekti(req, res);
  if (!dbProjekti) {
    return;
  }

  let executor = new ProjektiTestCommandExecutor(req.query);
  await executor.onNahtavillaoloMenneisyyteen(async () => {
    if (dbProjekti?.nahtavillaoloVaiheJulkaisut) {
      for (const julkaisu of dbProjekti.nahtavillaoloVaiheJulkaisut) {
        julkaisu.kuulutusVaihePaattyyPaiva = "2022-01-01";
        await projektiDatabase.updateNahtavillaoloVaiheJulkaisu(dbProjekti, julkaisu);
      }
    }
  });

  await executor.onHyvaksymispaatosMenneisyyteen(async () => {
    if (dbProjekti?.hyvaksymisPaatosVaiheJulkaisut) {
      for (const julkaisu of dbProjekti.hyvaksymisPaatosVaiheJulkaisut) {
        let yesterday = dayjs().add(-1, "day").format("YYYY-MM-DD");
        julkaisu.kuulutusPaiva = yesterday;
        julkaisu.kuulutusVaihePaattyyPaiva = yesterday;
        await projektiDatabase.updateHyvaksymisPaatosVaiheJulkaisu(dbProjekti, julkaisu);
      }
    }
  });

  await executor.onHyvaksymispaatosVuosiMenneisyyteen(async () => {
    if (dbProjekti?.hyvaksymisPaatosVaiheJulkaisut) {
      for (const julkaisu of dbProjekti.hyvaksymisPaatosVaiheJulkaisut) {
        let yearAgo = dayjs().add(-1, "year").add(-1, "day").format("YYYY-MM-DD");
        julkaisu.kuulutusPaiva = yearAgo;
        julkaisu.kuulutusVaihePaattyyPaiva = yearAgo;
        await projektiDatabase.updateHyvaksymisPaatosVaiheJulkaisu(dbProjekti, julkaisu);
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
    await testProjektiDatabase.saveProjekti({
      oid,
      ...suunnitteluVaiheFields,
    });
  });

  await executor.onResetVuorovaikutukset(async (oid: string) => {
    await testProjektiDatabase.saveProjekti({
      oid,
      ...vuorovaikutusFields,
    });
  });

  await executor.onResetNahtavillaolo(async (oid: string) => {
    await testProjektiDatabase.saveProjekti({
      oid,
      ...nahtavillaoloVaiheFields,
    });
  });

  await executor.onResetHyvaksymisvaihe(async (oid: string) => {
    await testProjektiDatabase.saveProjekti({
      oid,
      kasittelynTila: null,
      ...hyvaksymisPaatosVaiheFields,
    });
  });

  // text/html jotta cypress toimii paremmin
  res.setHeader("Content-Type", "text/html");
  res.send("<script>history.go(-1);</script>");
}
