import { NextApiRequest, NextApiResponse } from "next";
import { api, KuulutusTyyppi } from "@services/api";

export default async function userHandler(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { oid },
  } = req;

  if (Array.isArray(oid)) {
    throw new Error("Vain yksi oid-parametri sallitaan");
  }

  const pdf = await api.lataaKuulutusPDF(oid, KuulutusTyyppi.ALOITUSKUULUTUS);
  if (pdf) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-disposition", "inline; filename=" + pdf.nimi);
    res.send(Buffer.from(pdf.sisalto, "base64"));
  } else {
    res.status(404);
    res.setHeader("Content-Type", "text/plain;charset=UTF-8");
    res.send("Projektia ei löydy");
  }
}
