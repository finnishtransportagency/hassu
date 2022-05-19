import { AsiakirjaTyyppi } from "@services/api";
import { NextApiRequest, NextApiResponse } from "next";
import handlePdfRequest from "src/util/handlePdfRequest";

export default async function render(req: NextApiRequest, res: NextApiResponse) {
  console.log(req);
  handlePdfRequest({
    req,
    res,
    virheviesti: "Kutsun luonti epäonnistui",
    asiakirjaTyyppi: AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU,
  });
}
