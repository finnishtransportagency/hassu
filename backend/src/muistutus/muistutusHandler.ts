import { LisaaMuistutusMutationVariables, Status } from "../../../common/graphql/apiModel";
import { NotFoundError } from "../error/NotFoundError";
import { projektiDatabase } from "../database/projektiDatabase";
import { fileService } from "../files/fileService";
import { projektiAdapterJulkinen } from "../projekti/adapter/projektiAdapterJulkinen";
import { muistutusEmailService } from "./muistutusEmailService";
import { adaptMuistutusInput } from "./muistutusAdapter";
import { log } from "../logger";
import { isValidEmail } from "../email/emailUtil";

class MuistutusHandler {
  async kasitteleMuistutus({ oid, muistutus: muistutusInput }: LisaaMuistutusMutationVariables) {
    const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
    if (!projektiFromDB) {
      log.error("Projektia ei löydy");
      throw new NotFoundError("Projektia ei löydy");
    }
    const julkinenProjekti = await projektiAdapterJulkinen.adaptProjekti(projektiFromDB);
    if (!julkinenProjekti) {
      log.error("Projektia ei löydy tai se ei ole vielä julkinen");
      throw new NotFoundError("Projektia ei löydy tai se ei ole vielä julkinen");
    }

    if (julkinenProjekti.status !== Status.NAHTAVILLAOLO) {
      log.error("Projekti ei ole nähtävilläolovaiheessa, joten muistutuksia ei voi antaa", julkinenProjekti.status);
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

    await muistutusEmailService.sendEmailToKirjaamo(projektiFromDB, muistutus);

    await projektiDatabase.appendMuistutusTimestampList(oid);

    if (muistutus.sahkoposti && isValidEmail(muistutus.sahkoposti)) {
      await muistutusEmailService.sendEmailToMuistuttaja(projektiFromDB, muistutus);
    } else {
      log.error("Muistuttajalle ei voitu lähettää kuittausviestiä: ", muistutus.sahkoposti);
    }

    return "OK";
  }
}

export const muistutusHandler = new MuistutusHandler();
