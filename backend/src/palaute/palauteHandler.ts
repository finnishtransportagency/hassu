import * as API from "../../../common/graphql/apiModel";
import { OtaPalauteKasittelyynMutationVariables } from "../../../common/graphql/apiModel";
import { requirePermissionMuokkaaProjekti } from "../projekti/projektiHandler";
import { adaptPalautteetToAPI } from "./palauteAdapter";
import { feedbackDatabase } from "../database/palauteDatabase";
import { requirePermissionLuku } from "../user";
import { ProjektiPaths } from "../files/ProjektiPath";
import { virusScanService } from "../files/virusScanService";
import orderBy from "lodash/orderBy";

class PalauteHandler {
  async otaPalauteKasittelyyn({ oid, id }: OtaPalauteKasittelyynMutationVariables) {
    await requirePermissionMuokkaaProjekti(oid);
    await feedbackDatabase.markFeedbackIsBeingHandled(oid, id);
    return id;
  }

  async listaaPalautteet(oid: string): Promise<API.Palaute[] | undefined> {
    requirePermissionLuku();
    const palautteet = (await feedbackDatabase.listFeedback(oid)) || [];
    let apiPalautteet = adaptPalautteetToAPI(palautteet);
    if (apiPalautteet && apiPalautteet.length > 0) {
      apiPalautteet = orderBy(apiPalautteet, ["vastaanotettu"], ["desc"]);
      const projektiPath = new ProjektiPaths(oid);
      for (let i = 0; i < apiPalautteet.length; i++) {
        const palaute = apiPalautteet[i];
        palaute.liitteenSkannausTulos = await virusScanService.getVirusScanResult(projektiPath, palaute.liite);
      }
    }
    return apiPalautteet;
  }
}

export const palauteHandler = new PalauteHandler();
