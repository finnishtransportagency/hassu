import { findVuorovaikutusByNumber } from "../util/findVuorovaikutusByNumber";
import * as API from "../../../common/graphql/apiModel";
import { IlmoituksenVastaanottajat } from "../database/model";
import { asiakirjaService } from "../asiakirja/asiakirjaService";
import { fileService } from "../files/fileService";
import { projektiDatabase } from "../database/projektiDatabase";
import { emailClient } from "../email/email";
import { ProjektiPaths } from "../files/ProjektiPath";

class VuorovaikutusService {
  async handleVuorovaikutusKutsu(oid: string, vuorovaikutusNumero: number) {
    // Generate invitation PDF
    const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
    const vuorovaikutus = findVuorovaikutusByNumber(projektiInDB, vuorovaikutusNumero);
    const vuorovaikutusKutsuPath = new ProjektiPaths(oid).vuorovaikutus(vuorovaikutus).yllapitoPath + "/kutsu";

    async function generateKutsuPDF(kieli: API.Kieli) {
      const pdf = await asiakirjaService.createYleisotilaisuusKutsuPdf({
        projekti: projektiInDB,
        vuorovaikutus,
        kieli,
        luonnos: false,
      });

      const fullFilePathInProjekti = await fileService.createFileToProjekti({
        oid,
        filePathInProjekti: vuorovaikutusKutsuPath,
        fileName: pdf.nimi,
        contents: Buffer.from(pdf.sisalto, "base64"),
        inline: true,
        contentType: "application/pdf",
      });
      return { ...pdf, fullFilePathInProjekti };
    }

    const attachments = [];

    const pdfEnsisijainen = await generateKutsuPDF(projektiInDB.kielitiedot.ensisijainenKieli);
    vuorovaikutus.vuorovaikutusPDFt = {};
    vuorovaikutus.vuorovaikutusPDFt[projektiInDB.kielitiedot.ensisijainenKieli] = {
      kutsuPDFPath: pdfEnsisijainen.fullFilePathInProjekti,
    };
    attachments.push(asiakirjaService.createPDFAttachment(pdfEnsisijainen));

    if (projektiInDB.kielitiedot.toissijainenKieli) {
      const pdfToissijainen = await generateKutsuPDF(projektiInDB.kielitiedot.toissijainenKieli);
      vuorovaikutus.vuorovaikutusPDFt[projektiInDB.kielitiedot.toissijainenKieli] = {
        kutsuPDFPath: pdfToissijainen.fullFilePathInProjekti,
      };
      attachments.push(asiakirjaService.createPDFAttachment(pdfToissijainen));
    }

    await projektiDatabase.saveProjekti({ oid, vuorovaikutukset: [vuorovaikutus] });

    const emailOptions = asiakirjaService.createYleisotilaisuusKutsuEmail({
      projekti: projektiInDB,
      vuorovaikutus,
      kieli: projektiInDB.kielitiedot.ensisijainenKieli,
      luonnos: false,
    });
    emailOptions.attachments = attachments;

    const recipients = this.collectRecipients(vuorovaikutus.ilmoituksenVastaanottajat);
    for (const recipient of recipients) {
      await emailClient.sendEmail({ ...emailOptions, to: recipient });
    }
  }

  collectRecipients(ilmoituksenVastaanottajat: IlmoituksenVastaanottajat): string[] {
    return []
      .concat(ilmoituksenVastaanottajat?.kunnat?.map((kunta) => kunta.sahkoposti))
      .concat(ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) => viranomainen.sahkoposti))
      .filter((s) => s);
  }
}

export const vuorovaikutusService = new VuorovaikutusService();
