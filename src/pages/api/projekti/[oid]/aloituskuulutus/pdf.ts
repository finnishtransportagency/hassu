import { NextApiRequest, NextApiResponse } from "next";
import { api, KuulutusTyyppi } from "@services/api";
import { GetParameterCommand } from "@aws-sdk/client-ssm";
import { getSSMClient } from "../../../../../../backend/src/aws/clients";
import { setupXRay } from "../../../../../../backend/src/aws/xray";

setupXRay();

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

export default async function render(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { oid },
  } = req;
  const {
    body: { tallennaProjektiInput },
  } = req;
  if (Array.isArray(oid)) {
    throw new Error("Vain yksi oid-parametri sallitaan");
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
    let changes = JSON.parse(tallennaProjektiInput);
    if (!changes.oid) {
      changes = undefined;
    }
    const pdf = await api.lataaKuulutusPDF(oid, KuulutusTyyppi.ALOITUSKUULUTUS, changes);
    if (pdf) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-disposition", "inline; filename=" + pdf.nimi);
      res.send(Buffer.from(pdf.sisalto, "base64"));
    } else {
      res.status(404);
      res.setHeader("Content-Type", "text/plain;charset=UTF-8");
      res.send("Projektia ei löydy");
    }
  } catch (e) {
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
}
