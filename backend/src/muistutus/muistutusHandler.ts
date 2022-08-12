import { LisaaMuistutusMutationVariables, Status } from "../../../common/graphql/apiModel";
import { NotFoundError } from "../error/NotFoundError";
import { projektiDatabase } from "../database/projektiDatabase";
import { fileService } from "../files/fileService";
import { projektiAdapterJulkinen } from "../handler/projektiAdapterJulkinen";
import { muistutusEmailService } from "./muistutusEmailService";
import { adaptMuistutusInput } from "./muistutusAdapter";
import { isValidEmail } from "../util/emailUtil";
import { log } from "../logger";

class MuistutusHandler {
  async kasittelePalaute({ oid, muistutus: muistutusInput }: LisaaMuistutusMutationVariables) {
    const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
    if (!projektiFromDB) {
      throw new NotFoundError("Projektia ei löydy");
    }
    const julkinenProjekti = projektiAdapterJulkinen.adaptProjekti(projektiFromDB);
    if (!julkinenProjekti) {
      throw new NotFoundError("Projektia ei löydy tai se ei ole vielä julkinen");
    }

    if (julkinenProjekti.status !== Status.NAHTAVILLAOLO) {
      throw new NotFoundError("Projekti ei ole nähtävilläolovaiheessa, joten muistutuksia ei voi antaa");
    }

    const muistutus = adaptMuistutusInput(muistutusInput);
    if (muistutus.liite) {
      muistutus.liite = await fileService.persistFileToProjekti({
        uploadedFileSource: muistutus.liite,
        oid,
        targetFilePathInProjekti: "muistutukset/" + muistutus.id,
      });
    }

    muistutusEmailService.sendEmailToKirjaamo(projektiFromDB, muistutus);

    if (muistutus.sahkoposti && isValidEmail(muistutus.sahkoposti)) {
      muistutusEmailService.sendEmailToMuistuttaja(projektiFromDB, muistutus);
    } else {
      log.error("Muistuttajalle ei voitu lähettää kuittausviestiä: ", muistutus.sahkoposti);
    }

    //TODO: kasvata ja tallenna lähetettyjen muistutusten määrää projektilla ->
    // ehkä aikaleimoina, niin lisää jäljitettävyyttä?

    return "OK";
  }
}

export const muistutusHandler = new MuistutusHandler();
