import { Kayttaja } from "hassu-common/graphql/apiModel";
import { emailClient } from "../../email/email";
import { KuulutusEmailCreator } from "../../email/kuulutusEmailCreator";
import { personSearch } from "../../personSearch/personSearchClient";
import { GenericDbKuulutusJulkaisu } from "../../projekti/projektiUtil";
import { assertIsDefined } from "../../util/assertions";
import { log } from "../../logger";
import { DBProjekti } from "../../database/model";
import { fileService } from "../../files/fileService";

export abstract class KuulutusHyvaksyntaEmailSender {
  public abstract sendEmails(oid: string): Promise<void>;

  async getKayttaja(uid: string): Promise<Kayttaja | undefined> {
    const kayttajas = await personSearch.getKayttajas();
    return kayttajas.getKayttajaByUid(uid);
  }

  protected async sendEmailToMuokkaaja(julkaisu: GenericDbKuulutusJulkaisu, emailCreator: KuulutusEmailCreator) {
    assertIsDefined(julkaisu.muokkaaja, "Julkaisun muokkaaja puuttuu");
    const muokkaaja: Kayttaja | undefined = await this.getKayttaja(julkaisu.muokkaaja);
    assertIsDefined(muokkaaja, "Muokkaajan käyttäjätiedot puuttuu");
    const hyvaksyttyEmailMuokkajalle = emailCreator.createHyvaksyttyEmailMuokkaajalle(muokkaaja);
    if (hyvaksyttyEmailMuokkajalle.to) {
      await emailClient.sendEmail(hyvaksyttyEmailMuokkajalle);
    } else {
      log.error("Kuulutukselle ei loytynyt laatijan sahkopostiosoitetta");
    }
  }

  protected async getMandatoryProjektiFileAsAttachment(filepath: string | undefined | null, projekti: DBProjekti, logInfo: string) {
    if (!filepath) {
      throw new Error(`emailAttachmentError: Polku tiedostolle '${logInfo}' on määrittelemättä.`);
    }
    const pdf = await fileService.getFileAsAttachment(projekti.oid, filepath);
    if (!pdf) {
      throw new Error(`emailAttachmentError: Polusta '${filepath}' ei löytynyt tiedostoa.`);
    }
    return pdf;
  }
}
