import { NextApiRequest, NextApiResponse } from "next";
import { setupLambdaMonitoring, wrapXrayAsync } from "../../../backend/src/aws/monitoring";
import { Kieli } from "../../../common/graphql/apiModel";
import { ilmoitustauluSyoteHandler } from "../../../backend/src/ilmoitustauluSyote/ilmoitustauluSyoteHandler";
import { validateCredentials } from "../../util/basicAuthentication";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setupLambdaMonitoring();
  return await wrapXrayAsync("handler", async () => {
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

    const xml = await ilmoitustauluSyoteHandler.getFeed(kieli as Kieli);
    res.setHeader("Content-Type", "application/rss+xml; charset=UTF-8");
    res.send(xml);
  });
}
