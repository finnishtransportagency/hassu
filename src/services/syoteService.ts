import { Kieli, ProjektiJulkinen, Status } from "../../common/graphql/apiModel";
import {
  linkAloituskuulutus,
  linkHyvaksymismenettelyssa,
  linkHyvaksymisPaatos,
  linkNahtavillaOlo,
  linkSuunnitelma,
} from "../../common/links";
import { NextApiRequest, NextApiResponse } from "next";
import { setupLambdaMonitoring, wrapXRayAsync } from "../../backend/src/aws/monitoring";
import { createAuthorizationHeader, validateCredentials } from "../util/basicAuthentication";
import { api } from "@services/api/permanentApi";
import { getCredentials } from "../util/apiUtil";

type ProjektiTiedot = {
  nimi: Partial<Record<Kieli, string>>;
  link: string;
  status?: Status;
  aktiivinenKuulutus?: string;
};

function createActiveKuulutusLink(projekti: ProjektiJulkinen): string | undefined {
  switch (projekti.status) {
    case Status.ALOITUSKUULUTUS:
      return linkAloituskuulutus(projekti.oid);
    case Status.SUUNNITTELU:
      return linkAloituskuulutus(projekti.oid);
    case Status.NAHTAVILLAOLO:
      return linkNahtavillaOlo(projekti.oid);
    case Status.HYVAKSYMISMENETTELYSSA:
      return linkHyvaksymismenettelyssa(projekti.oid);
    case Status.HYVAKSYTTY:
      return linkHyvaksymisPaatos(projekti.oid);
  }
}

export async function handleSuunnitelmaTiedotRequest(req: NextApiRequest, res: NextApiResponse) {
  setupLambdaMonitoring();
  return await wrapXRayAsync("handler", async () => {
    if (process.env.ENVIRONMENT !== "prod" && !(await validateCredentials(req.headers.authorization))) {
      res.status(401);
      res.setHeader("www-authenticate", "Basic");

      res.send("");
      return;
    }

    const {
      query: { oid },
    } = req;
    if (Array.isArray(oid)) {
      throw new Error("Vain yksi oid-parametri sallitaan");
    }

    try {
      // Basic authentication header is added here because it is not present in NextApiRequest. The actual API call authenticates the user with cookies, so this is not a security issue
      const { username, password } = await getCredentials();
      await api.setOneTimeForwardHeaders({
        ...req.headers,
        authorization: createAuthorizationHeader(username, password),
      });

      const projekti = await api.lataaProjektiJulkinen(oid);
      if (projekti) {
        res.setHeader("Content-Type", "application/json; charset=UTF-8");

        const nimi: Partial<Record<Kieli, string>> = {};
        if (projekti.kielitiedot?.ensisijainenKieli) {
          nimi[projekti.kielitiedot?.ensisijainenKieli] = projekti.velho.nimi || "";
          if (projekti.kielitiedot?.toissijainenKieli) {
            nimi[projekti.kielitiedot?.toissijainenKieli] = projekti.kielitiedot?.projektinNimiVieraskielella || "";
          }
        }

        const link = linkSuunnitelma(oid);

        const activeKuulutusLink = createActiveKuulutusLink(projekti);

        const tiedot: ProjektiTiedot = {
          nimi,
          status: projekti.status || undefined,
          link,
          aktiivinenKuulutus: activeKuulutusLink,
        };
        res.send(JSON.stringify(tiedot));
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
  });
}
