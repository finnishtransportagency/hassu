import { NextApiRequest, NextApiResponse } from "next";
import { api, Status } from "@services/api";
import { setupLambdaMonitoring } from "../../backend/src/aws/monitoring";
import { createAuthorizationHeader } from "./basicAuthentication";
import { getCredentials } from "./apiUtil";

setupLambdaMonitoring();

export const handleZipRequest = async (req: NextApiRequest, res: NextApiResponse) => {
  const {
    query: { oid, vaihe },
  } = req;
  if (Array.isArray(oid)) {
    throw new Error("Vain yksi oid-parametri sallitaan");
  }
  if (Array.isArray(vaihe)) {
    throw new Error("Vain yksi vaihe-parametri sallitaan");
  }

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // Basic authentication header is added here because it is not present in NextApiRequest. The actual API call authenticates the user with cookies, so this is not a security issue
    const { username, password } = await getCredentials();
    api.setOneTimeForwardHeaders({
      ...req.headers,
      authorization: createAuthorizationHeader(username, password),
    });

    const linkki = await api.lataaKaikkiAineisto(oid, vaihe as Status);

    if (linkki) {
      res.setHeader("Location", linkki);
      res.status(302);
      res.end();
    } else {
      res.status(404);
      res.setHeader("Content-Type", "text/plain;charset=UTF-8");
      res.send("Aineiston paketointi epäonnistui");
    }
  } catch (e: any) {
    // tslint:disable-next-line:no-console
    console.error("Error generating zip:", e, e.networkError?.result);

    const networkError = e.networkError;
    if (networkError?.statusCode) {
      res.status(networkError.statusCode);
      res.send(networkError.bodyText);
    } else {
      res.status(500);
      res.setHeader("Content-Type", "text/plain;charset=UTF-8");
      res.send("");
    }
  }
};

export default handleZipRequest;
