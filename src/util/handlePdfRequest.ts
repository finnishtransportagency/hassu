import { NextApiRequest, NextApiResponse } from "next";
import { api, AsiakirjaTyyppi, Kieli, PDF, TallennaProjektiInput } from "@services/api";
import { setupLambdaMonitoring } from "../../backend/src/aws/monitoring";
import { createAuthorizationHeader } from "./basicAuthentication";
import { getCredentials } from "./apiUtil";

setupLambdaMonitoring();

export enum PdfRequestType {
  ASIAKIRJA,
  PALAUTTEET,
}

interface PdfRequestProps {
  req: NextApiRequest;
  res: NextApiResponse;
  type: PdfRequestType;
}

export const handlePdfRequest = async ({ req, res, type }: PdfRequestProps) => {
  const {
    query: { oid, kieli },
    body: { tallennaProjektiInput, asiakirjaTyyppi },
  } = req;
  if (Array.isArray(oid)) {
    throw new Error("Vain yksi oid-parametri sallitaan");
  }
  if (!oid) {
    throw new Error("oid-parametri vaaditaan");
  }
  if (Array.isArray(kieli)) {
    throw new Error("Vain yksi kieli-parametri sallitaan");
  }

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // Basic authentication header is added here because it is not present in NextApiRequest. The actual API call authenticates the user with cookies, so this is not a security issue
    const { username, password } = await getCredentials();
    api.setOneTimeForwardHeaders({
      ...req.headers,
      authorization: createAuthorizationHeader(username, password),
    });

    let pdf: PDF | undefined;
    if (type == PdfRequestType.ASIAKIRJA) {
      let changes: TallennaProjektiInput;
      let tyyppi: AsiakirjaTyyppi;
      if (!asiakirjaTyyppi || !tallennaProjektiInput) {
        res.status(500);
        res.setHeader("Content-Type", "text/plain;charset=UTF-8");
        res.send("Asiakirjan esikatselua ei voi tehdä. Esikatselupyynnöstä puuttuu tietoja.");
        return;
      } else {
        changes = JSON.parse(tallennaProjektiInput) as TallennaProjektiInput;
        tyyppi = asiakirjaTyyppi as AsiakirjaTyyppi;
      }
      pdf = await api.esikatseleAsiakirjaPDF(oid, tyyppi, kieli as Kieli, changes);
    } else if (type == PdfRequestType.PALAUTTEET) {
      pdf = await api.lataaPalautteetPDF(oid);
    }

    if (pdf) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-disposition", "inline; filename=" + pdf.nimi);
      res.send(Buffer.from(pdf.sisalto, "base64"));
    } else {
      res.status(404);
      res.setHeader("Content-Type", "text/plain;charset=UTF-8");
      res.send("Asiakirjan luonti epäonnistui");
    }
  } catch (e: any) {
    // tslint:disable-next-line:no-console
    console.error("Error generating pdf:", e, e.networkError?.result);

    const networkError = e.networkError;
    if (networkError?.statusCode) {
      res.status(networkError.statusCode);
      res.send(networkError.bodyText);
    } else {
      res.status(500);
      res.setHeader("Content-Type", "text/plain;charset=UTF-8");
      res.send(e.message ?? "");
    }
  }
};

export default handlePdfRequest;
