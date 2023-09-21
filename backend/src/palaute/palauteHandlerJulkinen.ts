import { LisaaPalauteMutationVariables, Status } from "hassu-common/graphql/apiModel";
import { NotFoundError } from "hassu-common/error/NotFoundError";
import { projektiDatabase } from "../database/projektiDatabase";
import { adaptPalauteInput } from "./palauteAdapter";
import { fileService } from "../files/fileService";
import { projektiAdapterJulkinen } from "../projekti/adapter/projektiAdapterJulkinen";
import { palauteEmailService } from "./palauteEmailService";
import { feedbackDatabase } from "../database/palauteDatabase";
import { virusScanService } from "../files/virusScanService";
import { config } from "../config";
import { ProjektiPaths } from "../files/ProjektiPath";

class PalauteHandlerJulkinen {
  async lisaaPalaute({ oid, palaute: palauteInput }: LisaaPalauteMutationVariables) {
    const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
    if (!projektiFromDB) {
      throw new NotFoundError("Projektia ei löydy");
    }
    const julkinenProjekti = await projektiAdapterJulkinen.adaptProjekti(projektiFromDB);
    if (!julkinenProjekti) {
      throw new NotFoundError("Projektia ei löydy tai se ei ole vielä julkinen");
    }

    if (julkinenProjekti.status !== Status.SUUNNITTELU) {
      throw new NotFoundError("Projekti ei ole suunnitteluvaiheessa, joten palautetta ei voi antaa");
    }
    const palaute = adaptPalauteInput(oid, palauteInput);
    if (palaute.liite) {
      const liite = await fileService.persistFileToProjekti({
        uploadedFileSource: palaute.liite,
        oid,
        targetFilePathInProjekti: "palautteet/" + palaute.id,
      });
      palaute.liite = liite;
      await virusScanService.runScanOnFile(
        config.yllapitoBucketName,
        fileService.getYllapitoPathForProjektiFile(new ProjektiPaths(oid), liite)
      );
    }
    const palauteId = await feedbackDatabase.insertFeedback(palaute);
    await palauteEmailService.sendEmailsToPalautteidenVastaanottajat(projektiFromDB);
    return palauteId;
  }
}

export const palauteHandlerJulkinen = new PalauteHandlerJulkinen();
