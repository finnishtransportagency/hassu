import { NextApiRequest, NextApiResponse } from "next";
import { handleLyhytOsoiteRequest } from "@services/lyhytOsoiteService";

export default async function render(req: NextApiRequest, res: NextApiResponse) {
  await handleLyhytOsoiteRequest(req, res, "/sv");
}
