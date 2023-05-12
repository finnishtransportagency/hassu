import * as API from "../../../common/graphql/apiModel";
import { AsetaPalauteVastattuMutationVariables } from "../../../common/graphql/apiModel";
import { requirePermissionMuokkaaProjekti } from "../projekti/projektiHandler";
import { adaptPalautteetToAPI } from "./palauteAdapter";
import { feedbackDatabase } from "../database/palauteDatabase";
import { requirePermissionLuku } from "../user";
import { pdfGeneratorClient } from "../asiakirja/lambda/pdfGeneratorClient";
import { projektiDatabase } from "../database/projektiDatabase";
import { log, setLogContextOid } from "../logger";
import { ProjektiPaths } from "../files/ProjektiPath";
import { virusScanService } from "../files/virusScanService";

import orderBy from "lodash/orderBy";

class PalauteHandler {
  async asetaPalauteVastattu({ oid, id, vastattu }: AsetaPalauteVastattuMutationVariables) {
    await requirePermissionMuokkaaProjekti(oid);
    await feedbackDatabase.markFeedbackIsAnswered(oid, id, vastattu);
    return id;
  }

  async listaaPalautteet(oid: string): Promise<API.Palaute[] | undefined> {
    requirePermissionLuku();
    setLogContextOid(oid);
    log.info("listaaPalautteet");
    const palautteet = (await feedbackDatabase.listFeedback(oid)) || [];
    let apiPalautteet = adaptPalautteetToAPI(palautteet);
    if (apiPalautteet && apiPalautteet.length > 0) {
      apiPalautteet = orderBy(apiPalautteet, ["vastaanotettu"], ["desc"]);
      const projektiPath = new ProjektiPaths(oid);
      for (const palaute of apiPalautteet) {
        palaute.liitteenSkannausTulos = await virusScanService.getVirusScanResult(projektiPath, palaute.liite);
      }
    }
    return apiPalautteet;
  }

  async lataaPalautteetPDF(oid: string): Promise<API.PDF> {
    requirePermissionLuku();
    setLogContextOid(oid);
    log.info("lataaPalautteetPDF");
    const palautteet = (await feedbackDatabase.listFeedback(oid)) || [];
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    return pdfGeneratorClient.createPalautteetPDF(projekti?.velho?.nimi || "", palautteet);
  }
}

export const palauteHandler = new PalauteHandler();
