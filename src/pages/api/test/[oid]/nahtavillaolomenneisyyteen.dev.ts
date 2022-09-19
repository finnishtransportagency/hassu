import { NextApiRequest, NextApiResponse } from "next";
import { projektiDatabase } from "../../../../../backend/src/database/projektiDatabase";
import { authenticateAndLoadProjekti } from "../../../../util/apiUtil.dev";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const dbProjekti = await authenticateAndLoadProjekti(req, res);
  if (!dbProjekti) {
    return;
  }
  if (dbProjekti?.nahtavillaoloVaiheJulkaisut) {
    for (const julkaisu of dbProjekti.nahtavillaoloVaiheJulkaisut) {
      julkaisu.kuulutusVaihePaattyyPaiva = "2022-01-01";
      await projektiDatabase.updateNahtavillaoloVaiheJulkaisu(dbProjekti, julkaisu);
    }
  }
  res.send("OK");
}
