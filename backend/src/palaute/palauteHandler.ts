import { LisaaPalauteMutationVariables, OtaPalauteKasittelyynMutationVariables, Status } from "../../../common/graphql/apiModel";
import { NotFoundError } from "../error/NotFoundError";
import { requirePermissionMuokkaaProjekti } from "../projekti/projektiHandler";
import { projektiDatabase } from "../database/projektiDatabase";
import { adaptPalauteInput, adaptPalautteetToAPI } from "./palauteAdapter";
import { fileService } from "../files/fileService";
import { projektiAdapterJulkinen } from "../projekti/adapter/projektiAdapterJulkinen";
import { palauteEmailService } from "./palauteEmailService";
import { feedbackDatabase } from "../database/palauteDatabase";
import { requirePermissionLuku } from "../user";

class PalauteHandler {
  async lisaaPalaute({ oid, palaute: palauteInput }: LisaaPalauteMutationVariables) {
    const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
    if (!projektiFromDB) {
      throw new NotFoundError("Projektia ei löydy");
    }
    const julkinenProjekti = projektiAdapterJulkinen.adaptProjekti(projektiFromDB);
    if (!julkinenProjekti) {
      throw new NotFoundError("Projektia ei löydy tai se ei ole vielä julkinen");
    }

    if (julkinenProjekti.status !== Status.SUUNNITTELU) {
      throw new NotFoundError("Projekti ei ole suunnitteluvaiheessa, joten palautetta ei voi antaa");
    }
    const palaute = adaptPalauteInput(oid, palauteInput);
    if (palaute.liite) {
      palaute.liite = await fileService.persistFileToProjekti({
        uploadedFileSource: palaute.liite,
        oid,
        targetFilePathInProjekti: "palautteet/" + palaute.id,
      });
    }
    const palauteId = await feedbackDatabase.insertFeedback(palaute);
    await palauteEmailService.sendEmailsToPalautteidenVastaanottajat(projektiFromDB);
    return palauteId;
  }

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
