import { NextApiRequest, NextApiResponse } from "next";
import { projektiDatabase } from "../../../../../backend/src/database/projektiDatabase";
import { authenticateAndLoadProjekti } from "../../../../util/apiUtil.dev";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const dbProjekti = await authenticateAndLoadProjekti(req, res);
  if (!dbProjekti) {
    return;
  }
  if (dbProjekti?.hyvaksymisPaatosVaiheJulkaisut) {
    for (const julkaisu of dbProjekti.hyvaksymisPaatosVaiheJulkaisut) {
      julkaisu.kuulutusVaihePaattyyPaiva = "2020-01-01";
      await projektiDatabase.updateHyvaksymisPaatosVaiheJulkaisu(dbProjekti, julkaisu);
    }
  }
  res.send("OK");
}
