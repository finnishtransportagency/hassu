import { handleSuunnitelmaTiedotRequest } from "@services/syoteService";
import { NextApiRequest, NextApiResponse } from "next";

export default async function render(req: NextApiRequest, res: NextApiResponse) {
  await handleSuunnitelmaTiedotRequest(req, res);
}
