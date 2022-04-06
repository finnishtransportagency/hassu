import {
  LisaaPalauteMutationVariables,
  OtaPalauteKasittelyynMutationVariables,
  Status,
} from "../../../common/graphql/apiModel";
import { NotFoundError } from "../error/NotFoundError";
import { loadProjektiJulkinen, requirePermissionMuokkaaProjekti } from "../handler/projektiHandler";
import { projektiDatabase } from "../database/projektiDatabase";
import { adaptPalauteInput } from "./palauteAdapter";
import { fileService } from "../files/fileService";

class PalauteHandler {
  async lisaaPalaute({ oid, palaute: palauteInput }: LisaaPalauteMutationVariables) {
    const projekti = await loadProjektiJulkinen(oid);
    if (!projekti) {
      throw new NotFoundError("Projektia ei löydy tai se ei ole vielä julkinen");
    }

    if (projekti.status !== Status.SUUNNITTELU) {
      throw new NotFoundError("Projekti ei ole suunnitteluvaiheessa, joten palautetta ei voi antaa");
    }
    const palaute = adaptPalauteInput(palauteInput);
    if (palaute.liite) {
      palaute.liite = await fileService.persistFileToProjekti({
        uploadedFileSource: palaute.liite,
        oid,
        targetFilePathInProjekti: "palautteet/" + palaute.id,
      });
    }
    return await projektiDatabase.insertFeedback(oid, palaute);
  }

  async otaPalauteKasittelyyn({ oid, id }: OtaPalauteKasittelyynMutationVariables) {
    const dbProjekti = await requirePermissionMuokkaaProjekti(oid);
    await projektiDatabase.markFeedbackIsBeingHandled(dbProjekti, id);
    return id;
  }
}

export const palauteHandler = new PalauteHandler();
