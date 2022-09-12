import type { NextApiRequest, NextApiResponse } from "next";
import { S3Cache } from "../../../backend/src/cache/s3Cache";
import log from "loglevel";
import { setupLambdaMonitoring, wrapXrayAsync } from "../../../backend/src/aws/monitoring";

const MAAKUNTALISTA_TTL_SECONDS = 24 * 3 * 60 * 60;

export type MaakuntaListaOption = {
  label: string;
  labelRuo: string;
  value: string;
};

async function fetchMaakuntaLista() {
  const response = await fetch("http://rajapinnat.ymparisto.fi/api/Hakemistorajapinta/1.0/odata/Maakunta");

  const data: any = await response.json();
  const list = data?.value?.map((maakunta: any) => {
    return { label: maakunta.Nimi, labelRuo: maakunta.NimiRuo, value: maakunta.Nimi.toUpperCase() };
  });
  list.unshift({ label: "", value: "" });
  return list;
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  setupLambdaMonitoring();
  return await wrapXrayAsync("handler", async () => {
    const s3Cache = new S3Cache();
    const kuntaList: Record<string, string> = await s3Cache.get(
      "maakuntalista",
      MAAKUNTALISTA_TTL_SECONDS * 1000,
      async () => {
        log.info("Updating maakuntalista, it has been expired");
        const list = await fetchMaakuntaLista();
        s3Cache.put("kuntalista", list);
      },
      async () => {
        log.info("Updating maakuntalista, it is missing");
        const list = await fetchMaakuntaLista();
        s3Cache.put("kuntalista", list);
        return list;
      }
    );

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=" + MAAKUNTALISTA_TTL_SECONDS + ", stale-while-revalidate=" + (MAAKUNTALISTA_TTL_SECONDS - 30)
    );
    res.status(200).json(kuntaList);
  });
}
