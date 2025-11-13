import { NextApiRequest, NextApiResponse } from "next";
import { setupLambdaMonitoring, wrapXRayAsync } from "../../../backend/src/aws/monitoring";
import { Kieli } from "hassu-common/graphql/apiModel";
import { ilmoitustauluSyoteHandler } from "../../../backend/src/ilmoitustauluSyote/ilmoitustauluSyoteHandler";
import { validateCredentials } from "../../util/basicAuthentication";
import { NotFoundError } from "hassu-common/error";
import { isKieliTranslatable, KaannettavaKieli } from "hassu-common/kaannettavatKielet";

function getSingleParamValue(req: NextApiRequest, paramName: string) {
  const values = req.query[paramName];
  return values instanceof Array ? values[0] : values;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setupLambdaMonitoring();
  return await wrapXRayAsync("handler", async () => {
    if (process.env.NEXT_PUBLIC_ENVIRONMENT !== "prod" && !(await validateCredentials(req.headers.authorization))) {
      res.status(401);
      res.setHeader("www-authenticate", "Basic");

      res.send("");
      return;
    }

    const kieli = req.query["kieli"];
    if (kieli instanceof Array || !isKieliTranslatable(kieli as Kieli)) {
      res.status(400);
      res.send("");
      return;
    }

    const ely = getSingleParamValue(req, "ely");
    const lely = getSingleParamValue(req, "lely");
    const maakunta = getSingleParamValue(req, "maakunta");
    const elinvoimakeskus = getSingleParamValue(req, "elinvoimakeskus");

    try {
      const xml = await ilmoitustauluSyoteHandler.getFeed(kieli as KaannettavaKieli, ely, lely, elinvoimakeskus, maakunta);
      res.setHeader("Content-Type", "application/rss+xml; charset=UTF-8");
      res.send(xml);
    } catch (e) {
      if (e instanceof NotFoundError) {
        res.status(404);
        res.send(e.message);
      } else {
        res.status(500);
        res.send(e instanceof Error ? e.message : "Virhe.");
      }
    }
  });
}
