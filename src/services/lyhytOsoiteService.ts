import { lyhytOsoiteDatabase } from "../../backend/src/database/lyhytOsoiteDatabase";
import { NextApiRequest, NextApiResponse } from "next";
import isArray from "lodash/isArray";

let cache: Record<string, string> = {};
let cacheExpires = 0;

export async function handleLyhytOsoiteRequest(req: NextApiRequest, res: NextApiResponse, lang: string) {
  let groups;
  if (isArray(req.query.path)) {
    groups = req.query.path;
  } else {
    groups = [req.query.path];
  }
  if (groups && groups.length > 0) {
    const lyhytOsoite = groups[0];
    let oid = await fetchOidFromDynamoDB(lyhytOsoite);
    console.log("lyhytOsoite " + lyhytOsoite + " -> " + oid);
    if (oid) {
      groups[0] = oid;
      const resultURI = lang + "/suunnitelma/" + groups.join("/");
      res.status(302);
      res.setHeader("location", resultURI);
      res.send("");
      return;
    }
  }
  res.status(404);
  res.setHeader("Content-Type", "test/plain:charset=UTF-8");
  res.send("Lyhytosoitetta ei löydy");
}

async function fetchOidFromDynamoDB(lyhytOsoite: string) {
  let now = new Date().getTime();
  if (cacheExpires < now) {
    cache = {};
    cacheExpires = now + 100 * 60 * 10; // 10min
  }
  let oid: string | undefined = cache[lyhytOsoite];
  if (!oid) {
    oid = await lyhytOsoiteDatabase.getOidForLyhytOsoite(lyhytOsoite);
    if (oid) {
      cache[lyhytOsoite] = oid;
    }
  }
  return oid;
}
