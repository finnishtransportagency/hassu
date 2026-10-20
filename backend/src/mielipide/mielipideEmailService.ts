// Contains code generated or recommended by Amazon Q
import { DBProjekti } from "../database/model";
import { DBMielipide } from "../database/mielipideDatabase";
import { emailClient } from "../email/email";
import { createMielipideKirjaamolleEmail } from "../email/emailTemplates";
import { kirjaamoOsoitteetService } from "../kirjaamoOsoitteet/kirjaamoOsoitteetService";
import { log } from "../logger";
import { fileService } from "../files/fileService";

class MielipideEmailService {
  async sendEmailToKirjaamo(projekti: DBProjekti, mielipide: DBMielipide) {
    if (!projekti.velho?.suunnittelustaVastaavaViranomainen) {
      throw new Error("projekti.velho.suunnittelustaVastaavaViranomainen ei määritelty");
    }
    const kirjaamot = await kirjaamoOsoitteetService.listKirjaamoOsoitteet();
    const sahkoposti = kirjaamot.find(
      ({ nimi }) => nimi.toString() === projekti.velho!.suunnittelustaVastaavaViranomainen!.toString()
    )?.sahkoposti;
    if (!sahkoposti) {
      log.error("Vastaavan viranomaisen kirjaamon sähköpostiosoitetta ei löytynyt", projekti.velho.suunnittelustaVastaavaViranomainen);
      throw new Error("Mielipidettä ei voitu lähettää kirjaamoon, syy: kirjaamon osoitetta ei löytynyt");
    }

    const emailOptions = createMielipideKirjaamolleEmail(projekti, mielipide, sahkoposti);

    if (mielipide.liitteet?.length) {
      emailOptions.attachments = await Promise.all(
        mielipide.liitteet.map(async (liite) => {
          const liiteTiedosto = await fileService.getFileAsAttachment(projekti.oid, liite);
          if (!liiteTiedosto) {
            throw new Error("Liitetiedostoa ei saatu");
          }
          return liiteTiedosto;
        })
      );
    }

    const result = await emailClient.sendTurvapostiEmail(emailOptions);
    if (result) {
      log.info("Mielipiteen sisältävä sähköposti lähetetty: " + emailOptions.to);
    } else {
      throw new Error("Mielipiteen lähetys kirjaamoon epäonnistui: sähköpostin lähetys ei palauttanut onnistunutta vastausta");
    }
  }
}

export const mielipideEmailService = new MielipideEmailService();
