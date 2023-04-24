import { NextApiRequest, NextApiResponse } from "next";
import handlePdfRequest, { PdfRequestType } from "src/util/handlePdfRequest";

export default async function render(req: NextApiRequest, res: NextApiResponse) {
  await handlePdfRequest({
    req,
    res,
    type: PdfRequestType.PALAUTTEET,
  });
}
