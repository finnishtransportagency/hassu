import { findVuorovaikutusByNumber } from "../handler/projektiAdapter";
import { IlmoituksenVastaanottajat } from "../../../common/graphql/apiModel";
import { asiakirjaService } from "../asiakirja/asiakirjaService";
import { fileService } from "../files/fileService";
import { projektiDatabase } from "../database/projektiDatabase";
import { emailClient } from "../email/email";

class VuorovaikutusService {
  async handleVuorovaikutusKutsu(oid: string, vuorovaikutusNumero: number) {
    // Generate invitation PDF
    const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
    const vuorovaikutus = findVuorovaikutusByNumber(projektiInDB, vuorovaikutusNumero);
    const pdf = await asiakirjaService.createYleisotilaisuusKutsuPdf({
      projekti: projektiInDB,
      vuorovaikutus,
      kieli: projektiInDB.kielitiedot.ensisijainenKieli,
      luonnos: false,
    });

    const vuorovaikutusKutsuPath = fileService.getVuorovaikutusPath(vuorovaikutus) + "/kutsu";

    await fileService.createFileToProjekti({
      oid,
      filePathInProjekti: vuorovaikutusKutsuPath,
      fileName: pdf.nimi,
      contents: Buffer.from(pdf.sisalto, "base64"),
      inline: true,
      contentType: "application/pdf",
    });

    const emailOptions = asiakirjaService.createYleisotilaisuusKutsuEmail({
      projekti: projektiInDB,
      vuorovaikutus,
      kieli: projektiInDB.kielitiedot.ensisijainenKieli,
      luonnos: false,
    });
    emailOptions.attachments = [
      {
        filename: pdf.nimi,
        contentDisposition: "attachment",
        contentType: "application/pdf",
        content: Buffer.from(pdf.sisalto, "base64"),
      },
    ];

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
