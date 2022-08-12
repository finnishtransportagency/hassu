import { NextApiRequest, NextApiResponse } from "next";
import { projektiDatabase } from "../../../../../backend/src/database/projektiDatabase";
import { validateCredentials } from "../../../../util/basicAuthentication";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let environment = process.env.ENVIRONMENT;
  if ((environment == "dev" || environment == "test") && !(await validateCredentials(req.headers.authorization))) {
    res.status(401);
    res.setHeader("www-authenticate", "Basic");

    res.send("");
    return;
  }

  const oid = req.query["oid"];
  if (oid instanceof Array || !oid || oid.length == 0) {
    res.status(400);
    res.send("");
    return;
  }

  res.setHeader("Content-Type", "text/plain; charset=UTF-8");

  let dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  if (!dbProjekti) {
    res.send("Projektia ei löydy");
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
