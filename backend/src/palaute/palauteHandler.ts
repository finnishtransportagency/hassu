import { OtaPalauteKasittelyynMutationVariables } from "../../../common/graphql/apiModel";
import { requirePermissionMuokkaaProjekti } from "../projekti/projektiHandler";
import { adaptPalautteetToAPI } from "./palauteAdapter";
import { feedbackDatabase } from "../database/palauteDatabase";
import { requirePermissionLuku } from "../user";

class PalauteHandler {
  async otaPalauteKasittelyyn({ oid, id }: OtaPalauteKasittelyynMutationVariables) {
    await requirePermissionMuokkaaProjekti(oid);
    await feedbackDatabase.markFeedbackIsBeingHandled(oid, id);
    return id;
  }

  async listaaPalautteet(oid: string) {
    requirePermissionLuku();
    const palautteet = (await feedbackDatabase.listFeedback(oid)) || [];
    return adaptPalautteetToAPI(palautteet);
  }
}

export const palauteHandler = new PalauteHandler();
