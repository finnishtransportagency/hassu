import { NextApiRequest, NextApiResponse } from "next";
import handleZipRequest from "src/util/handleZipRequest";

export default async function render(req: NextApiRequest, res: NextApiResponse) {
  await handleZipRequest(req, res);
}
