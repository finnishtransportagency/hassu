import { NextApiRequest, NextApiResponse } from "next";
import { api } from "@services/api";
import { setupLambdaMonitoring } from "../../backend/src/aws/monitoring";
import { createAuthorizationHeader } from "./basicAuthentication";
import { getCredentials } from "./apiUtil";

setupLambdaMonitoring();

export const handleZipRequest = async (req: NextApiRequest, res: NextApiResponse) => {
  const {
    query: { oid, id },
  } = req;
  if (Array.isArray(oid)) {
    throw new Error("Vain yksi oid-parametri sallitaan");
  }
  if (Array.isArray(id)) {
    throw new Error("Vain yksi id-parametri sallitaan");
  }

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // Basic authentication header is added here because it is not present in NextApiRequest. The actual API call authenticates the user with cookies, so this is not a security issue
    const { username, password } = await getCredentials();
    api.setOneTimeForwardHeaders({
      ...req.headers,
      authorization: createAuthorizationHeader(username, password),
    });
    const numberId = !Number.isNaN(Number(id)) ? parseInt(id) : undefined;
    if (!numberId) {
      res.status(400);
      res.setHeader("Content-Type", "text/plain;charset=UTF-8");
      res.send("Vaiheen id ei ole kelvollinen");
    } else {
      const linkki = await api.lataaLisaAineisto(oid, numberId);

      if (linkki) {
        res.setHeader("Location", linkki);
        res.status(302);
        res.end();
      } else {
        res.status(404);
        res.setHeader("Content-Type", "text/plain;charset=UTF-8");
        res.send("Aineiston paketointi epäonnistui");
      }
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
