import {
  LisaaPalauteMutationVariables,
  OtaPalauteKasittelyynMutationVariables,
  Status,
} from "../../../common/graphql/apiModel";
import { NotFoundError } from "../error/NotFoundError";
import { requirePermissionMuokkaaProjekti } from "../projekti/projektiHandler";
import { projektiDatabase } from "../database/projektiDatabase";
import { adaptPalauteInput } from "./palauteAdapter";
import { fileService } from "../files/fileService";
import { projektiAdapterJulkinen } from "../projekti/adapter/projektiAdapterJulkinen";
import { palauteEmailService } from "./palauteEmailService";

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
    const palaute = adaptPalauteInput(palauteInput);
    if (palaute.liite) {
      palaute.liite = await fileService.persistFileToProjekti({
        uploadedFileSource: palaute.liite,
        oid,
        targetFilePathInProjekti: "palautteet/" + palaute.id,
      });
    }
    const palauteId = await projektiDatabase.insertFeedback(oid, palaute);
    await palauteEmailService.sendEmailsToPalautteidenVastaanottajat(projektiFromDB);
    return palauteId;
  }

  async otaPalauteKasittelyyn({ oid, id }: OtaPalauteKasittelyynMutationVariables) {
    const dbProjekti = await requirePermissionMuokkaaProjekti(oid);
    await projektiDatabase.markFeedbackIsBeingHandled(dbProjekti, id);
    return id;
  }
}

export const palauteHandler = new PalauteHandler();
