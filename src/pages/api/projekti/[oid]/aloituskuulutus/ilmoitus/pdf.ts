import { AsiakirjaTyyppi } from "@services/api";
import { NextApiRequest, NextApiResponse } from "next";
import handlePdfRequest from "src/util/handlePdfRequest";

export default async function render(req: NextApiRequest, res: NextApiResponse) {
  handlePdfRequest({
    req,
    res,
    virheviesti: "Ilmoituksen luonti epäonnistui",
    asiakirjaTyyppi: AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA,
  });
}
