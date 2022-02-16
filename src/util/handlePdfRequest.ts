import { NextApiRequest, NextApiResponse } from "next";
import { api, AsiakirjaTyyppi, Kieli } from "@services/api";
import { GetParameterCommand } from "@aws-sdk/client-ssm";
import { getSSMClient } from "../../backend/src/aws/clients";
import { setupLambdaMonitoring } from "../../backend/src/aws/monitoring";

setupLambdaMonitoring();

const ssm = getSSMClient();

async function getParameter(name: string) {
  return (await ssm.send(new GetParameterCommand({ Name: name }))).Parameter?.Value;
}

async function getParameterStore() {
  const parameterStore = {} as any;

  parameterStore.BASIC_USERNAME = await getParameter(
    "/" + process.env.INFRA_ENVIRONMENT + "/basicAuthenticationUsername"
  );
  parameterStore.BASIC_PASSWORD = await getParameter(
    "/" + process.env.INFRA_ENVIRONMENT + "/basicAuthenticationPassword"
  );
  return parameterStore;
}

interface PdfRequestProps {
  req: NextApiRequest;
  res: NextApiResponse;
  asiakirjaTyyppi: AsiakirjaTyyppi;
  virheviesti?: string;
}

export const handlePdfRequest = async ({ req, res, asiakirjaTyyppi, virheviesti }: PdfRequestProps) => {
  const {
    query: { oid, kieli },
    body: { tallennaProjektiInput },
  } = req;
  if (Array.isArray(oid)) {
    throw new Error("Vain yksi oid-parametri sallitaan");
  }
  if (Array.isArray(kieli)) {
    throw new Error("Vain yksi kieli-parametri sallitaan");
  }

  try {
    // Basic authentication header is added here because it is not present in NextApiRequest. The actual API call authenticates the user with cookies, so this is not a security issue
    const parameterStore = await getParameterStore();
    api.setOneTimeForwardHeaders({
      ...req.headers,
      authorization:
        "Basic " +
        Buffer.from(parameterStore.BASIC_USERNAME + ":" + parameterStore.BASIC_PASSWORD, "binary").toString("base64"),
    });
    let changes;
    if (tallennaProjektiInput) {
      changes = JSON.parse(tallennaProjektiInput);
    }

    const pdf = await api.esikatseleAsiakirjaPDF(oid, asiakirjaTyyppi, kieli as Kieli, changes);
    if (pdf) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-disposition", "inline; filename=" + pdf.nimi);
      res.send(Buffer.from(pdf.sisalto, "base64"));
    } else {
      res.status(404);
      res.setHeader("Content-Type", "text/plain;charset=UTF-8");
      res.send(virheviesti || "Asiakirjan luonti epäonnistui");
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
