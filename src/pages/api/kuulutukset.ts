import { NextApiRequest, NextApiResponse } from "next";
import { setupLambdaMonitoring, wrapXRayAsync } from "../../../backend/src/aws/monitoring";
import { Kieli } from "../../../common/graphql/apiModel";
import { ilmoitustauluSyoteHandler } from "../../../backend/src/ilmoitustauluSyote/ilmoitustauluSyoteHandler";
import { validateCredentials } from "../../util/basicAuthentication";
import { NotFoundError } from "../../../backend/src/error/NotFoundError";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setupLambdaMonitoring();
  return await wrapXRayAsync("handler", async () => {
    if (!(await validateCredentials(req.headers.authorization))) {
      res.status(401);
      res.setHeader("www-authenticate", "Basic");

      res.send("");
      return;
    }

    const kieli = req.query["kieli"];
    if (kieli instanceof Array || Object.keys(Kieli).indexOf(kieli) < 0) {
      res.status(400);
      res.send("");
      return;
    }

    const elyParam = req.query["ely"];
    const ely = elyParam instanceof Array ? elyParam[0] : elyParam;

    const maakuntaParam = req.query["maakunta"];
    const maakunta = maakuntaParam instanceof Array ? maakuntaParam[0] : maakuntaParam;

    try {
      const xml = await ilmoitustauluSyoteHandler.getFeed(kieli as Kieli, ely, maakunta);
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
