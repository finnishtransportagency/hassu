import { NextApiRequest, NextApiResponse } from "next";
import { api, AsiakirjaTyyppi, Kieli, TallennaProjektiInput } from "@services/api";
import { setupLambdaMonitoring } from "../../backend/src/aws/monitoring";
import { parameterStore } from "./parameterStore";
import { createAuthorizationHeader } from "./basicAuthentication";

setupLambdaMonitoring();

async function getCredentials() {
  const username =
    (await parameterStore.getParameter("/" + process.env.INFRA_ENVIRONMENT + "/basicAuthenticationUsername")) || "";
  const password =
    (await parameterStore.getParameter("/" + process.env.INFRA_ENVIRONMENT + "/basicAuthenticationPassword")) || "";
  return { username, password };
}

interface PdfRequestProps {
  req: NextApiRequest;
  res: NextApiResponse;
}

export const handlePdfRequest = async ({ req, res }: PdfRequestProps) => {
  const {
    query: { oid, kieli },
    body: { tallennaProjektiInput, asiakirjaTyyppi },
  } = req;
  if (Array.isArray(oid)) {
    throw new Error("Vain yksi oid-parametri sallitaan");
  }
  if (Array.isArray(kieli)) {
    throw new Error("Vain yksi kieli-parametri sallitaan");
  }

  try {
    // Basic authentication header is added here because it is not present in NextApiRequest. The actual API call authenticates the user with cookies, so this is not a security issue
    const { username, password } = await getCredentials();
    api.setOneTimeForwardHeaders({
      ...req.headers,
      authorization: createAuthorizationHeader(username, password),
    });
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

    const pdf = await api.esikatseleAsiakirjaPDF(oid, tyyppi, kieli as Kieli, changes);
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
    if (networkError && networkError.statusCode) {
      res.status(networkError.statusCode);
      res.send(networkError.bodyText);
    } else {
      res.status(500);
      res.setHeader("Content-Type", "text/plain;charset=UTF-8");
      res.send("");
    }
  }
};

export default handlePdfRequest;
