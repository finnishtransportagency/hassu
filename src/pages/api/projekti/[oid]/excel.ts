import { api } from "@services/api";
import { NextApiRequest, NextApiResponse } from "next";
import { getCredentials } from "src/util/apiUtil";
import { createAuthorizationHeader } from "src/util/basicAuthentication";

export default async function render(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { suomifi, kiinteisto },
  } = req;
  const oid = req.url?.match(/[0-9.]+/)?.at(0);
  if (!oid) {
    throw new Error("oid-parametri vaaditaan");
  }
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // Basic authentication header is added here because it is not present in NextApiRequest. The actual API call authenticates the user with cookies, so this is not a security issue
    const { username, password } = await getCredentials();
    api.setOneTimeForwardHeaders({
      ...req.headers,
      authorization: createAuthorizationHeader(username, password),
    });

    const excel = await api.lataaTiedotettavatExcel(oid, suomifi === "true", kiinteisto === "true");
    res.setHeader("Content-Type", excel.tyyppi);
    res.setHeader("Content-disposition", "inline; filename=" + excel.nimi);
    res.send(Buffer.from(excel.sisalto, "base64"));
  } catch (e: any) {
    // tslint:disable-next-line:no-console
    console.error("Error loading excel:", e, e.networkError?.result);
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
}
