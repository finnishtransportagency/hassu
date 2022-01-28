import { NextApiRequest, NextApiResponse } from "next";
import { AsiakirjaTyyppi } from "@services/api";
import { handlePdfRequest } from "src/util/handlePdfRequest";

export default async function render(req: NextApiRequest, res: NextApiResponse) {
  handlePdfRequest({
    req,
    res,
    virheviesti: "Aloituskuulutuksen luonti epäonnistui",
    asiakirjaTyyppi: AsiakirjaTyyppi.ALOITUSKUULUTUS,
  });
}
