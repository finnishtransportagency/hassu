import { NextApiRequest, NextApiResponse } from "next";
import { DBProjekti } from "../../backend/src/database/model";
import { validateApiCredentials } from "./basicAuthentication";
import { projektiDatabase } from "../../backend/src/database/projektiDatabase";

export async function authenticateAndLoadProjekti(req: NextApiRequest, res: NextApiResponse): Promise<DBProjekti | undefined> {
  let environment = process.env.ENVIRONMENT;
  if ((environment == "dev" || environment == "test") && !(await validateApiCredentials(req.headers.authorization))) {
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
  if (dbProjekti) {
    return dbProjekti;
  }
  res.send("Projektia ei löydy");
}
