import type { NextApiRequest, NextApiResponse } from "next";
import { S3Cache } from "../../../backend/src/cache/s3Cache";
import log from "loglevel";
import { setupLambdaMonitoring, wrapXrayAsync } from "../../../backend/src/aws/monitoring";

const KUNTALISTA_TTL_SECONDS = 24 * 3 * 60 * 60;

async function fetchKuntaLista() {
  const response = await fetch("http://rajapinnat.ymparisto.fi/api/Hakemistorajapinta/1.0/odata/Kunta");

  const data: any = await response.json();
  const list = data?.value?.map((kunta: any) => {
    return { label: kunta.Nimi, value: kunta.Nimi.toUpperCase() };
  });
  list.unshift({ label: "", value: "" });
  return list;
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  setupLambdaMonitoring();
  return await wrapXrayAsync("handler", async () => {
    const s3Cache = new S3Cache(KUNTALISTA_TTL_SECONDS);
    const kuntaList: Record<string, string> = await s3Cache.get(
      "kuntalista",
      KUNTALISTA_TTL_SECONDS * 1000,
      async () => {
        log.info("Updating kuntalista, it has been expired");
        const list = await fetchKuntaLista();
        s3Cache.put("kuntalista", list);
      },
      async () => {
        log.info("Updating kuntalista, it is missing");
        const list = await fetchKuntaLista();
        s3Cache.put("kuntalista", list);
        return list;
      }
    );

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=" + KUNTALISTA_TTL_SECONDS + ", stale-while-revalidate=" + (KUNTALISTA_TTL_SECONDS - 30)
    );
    res.status(200).json(kuntaList);
  });
}
