import { projektiDatabase } from "../database/projektiDatabase";
import { DBProjekti } from "../database/model/projekti";
import { createNewFeedbackAvailableEmail } from "../email/emailTemplates";
import { emailClient } from "../email/email";
import { auditLog, log } from "../logger";
import { Palaute } from "../database/model";
import { nyt } from "../util/dateUtil";
import { Kieli } from "hassu-common/graphql/apiModel";

class PalauteEmailService {
  async sendEmailsToPalautteidenVastaanottajat(projekti: DBProjekti) {
    if (projekti.vuorovaikutusKierros?.palautteidenVastaanottajat) {
      for (const username of projekti.vuorovaikutusKierros.palautteidenVastaanottajat) {
        const recipient = projekti.kayttoOikeudet.find((user) => user.kayttajatunnus == username);
        if (recipient) {
          const emailOptions = createNewFeedbackAvailableEmail(projekti, recipient.email);
          if (emailOptions.to) {
            await emailClient.sendEmail(emailOptions);
            log.info("'Uusia palautteita'-email lähetetty: " + emailOptions.to);
          }
        }
      }
    }
  }

  async sendEmailToFeedbackSender(projekti: DBProjekti, palaute: Palaute) {
    const vastaanotettu = nyt().format("DD.MM.YYYY HH:mm");
    const ruotsiksi = projekti.kielitiedot?.ensisijainenKieli === Kieli.RUOTSI || projekti.kielitiedot?.toissijainenKieli === Kieli.RUOTSI;
    const liite = palaute.liite ? palaute.liite.substring(palaute.liite.lastIndexOf("/") + 1) : "";
    let text = `Palaute vastaanotettu
${vastaanotettu}
Nimi
${palaute.etunimi ?? ""} ${palaute.sukunimi ?? ""}
Sähköposti
${palaute.sahkoposti ?? ""}
Puhelinnumero
${palaute.puhelinnumero ?? ""}

Suunnitelman nimi
${projekti.velho?.nimi ?? ""}
Palaute
${palaute.kysymysTaiPalaute ?? ""}
${liite ? "Sähköpostiviestin liite\n" + liite : ""}
`
    if (ruotsiksi) {
      text += text = `
Respons mottagen
${vastaanotettu}
Namn
${palaute.etunimi ?? ""} ${palaute.sukunimi ?? ""}
E-post
${palaute.sahkoposti ?? ""}
Telefonnummer
${palaute.puhelinnumero ?? ""}

Planens namn
${projekti.kielitiedot?.projektinNimiVieraskielella ?? ""}
Respons
${palaute.kysymysTaiPalaute ?? ""}
${liite ? "Bifogad fil\n" + liite : ""}
`
    }
    if (palaute.sahkoposti) {
      await emailClient.sendEmail({ subject: `Vahvistus palautteen jättämisestä Valtion liikenneväylien suunnittelu -järjestelmän kautta${ruotsiksi ? " / Bekräftelse av att respons lämnats via systemet Planering av statens trafikleder" : ""}`, text, to: palaute.sahkoposti });
      auditLog.info("Palautteen antajalle lähetetty sähköpostikuittaus osoitteeseen " + palaute.sahkoposti);
    } else {
      auditLog.info("Palautteen antajalle ei lähetetty sähköpostikuittausta");
    }
  }

  async sendNewFeedbackDigest(): Promise<void> {
    const oids = await projektiDatabase.findProjektiOidsWithNewFeedback();
    log.info("Projekteja, joissa uusia palautteita " + oids.length + " kpl.");
    for (const oid of oids) {
      const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
      if (!dbProjekti) {
        throw new Error(`Projektia oid:lla ${oid} ei löytynyt tietokannasta`);
      }

      let recipients;
      // Send digest email to everybody else than the ones listed in palautteidenVastaanottajat. They already got the emails immediately when feedback was given
      if (dbProjekti.vuorovaikutusKierros?.palautteidenVastaanottajat) {
        recipients = dbProjekti.kayttoOikeudet.filter(
          // varmistettu jo, että palautteidenVastaanottajat on olemassa
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          (user) => dbProjekti.suunnitteluVaihe?.palautteidenVastaanottajat.indexOf(user.kayttajatunnus) < 0
        );
      } else {
        recipients = dbProjekti.kayttoOikeudet;
      }
      for (const recipient of recipients) {
        const emailOptions = createNewFeedbackAvailableEmail(dbProjekti, recipient.email);
        if (emailOptions.to) {
          await emailClient.sendEmail(emailOptions);
          log.info("'Uusia palautteita'-email lähetetty: " + emailOptions.to);
        }
      }
      await projektiDatabase.clearNewFeedbacksFlagOnProject(oid);
    }
  }
}

export const palauteEmailService = new PalauteEmailService();
