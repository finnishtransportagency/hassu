import { ProjektiAdaptationResult } from "../handler/projektiAdapter";
import { aineistoService } from "../aineisto/aineistoService";
import { AloitusKuulutusTila, AsiakirjaTyyppi, IlmoituksenVastaanottajat } from "../../../common/graphql/apiModel";
import { asiakirjaService } from "../asiakirja/asiakirjaService";
import { fileService } from "../files/fileService";
import { projektiDatabase } from "../database/projektiDatabase";
import { emailClient } from "../email/email";

class VuorovaikutusService {
  /**
   * If there are uploaded files in the input, persist them into the project
   */
  async handleAineistot(projektiAdaptationResult: ProjektiAdaptationResult): Promise<void> {
    const {
      aineistoChanges,
      projekti: { oid },
    } = projektiAdaptationResult;
    if (!aineistoChanges) {
      return;
    }
    if (aineistoChanges.hasPendingImports) {
      await aineistoService.importAineisto(oid, aineistoChanges.vuorovaikutus.vuorovaikutusNumero);
    }

    if (aineistoChanges.aineistotToDelete) {
      await aineistoService.deleteAineisto(oid, aineistoChanges.aineistotToDelete);
    }

    // If vuorovaikutus status was changed from not public to public
    if (
      projektiAdaptationResult.aineistoChanges?.julkinenChanged &&
      projektiAdaptationResult.aineistoChanges?.vuorovaikutus?.julkinen
    ) {
      await this.handleVuorovaikutusKutsu(projektiAdaptationResult);
    }
    if (
      aineistoChanges.vuorovaikutus?.julkinen &&
      (aineistoChanges.hasPendingImports || aineistoChanges.aineistotToDelete || aineistoChanges.julkinenChanged)
    ) {
      await aineistoService.synchronizeVuorovaikutusAineistoToPublic(projektiAdaptationResult);
    }
  }

  async handleVuorovaikutusKutsu({ aineistoChanges: { vuorovaikutus }, projekti: { oid } }: ProjektiAdaptationResult) {
    // Generate invitation PDF
    const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
    const aloitusKuulutusJulkaisu = projektiInDB.aloitusKuulutusJulkaisut
      .filter((julkaisu) => julkaisu.tila == AloitusKuulutusTila.HYVAKSYTTY)
      .pop();
    const pdf = await asiakirjaService.createPdf({
      asiakirjaTyyppi: AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU,
      projekti: projektiInDB,
      aloitusKuulutusJulkaisu,
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

    const emailOptions = asiakirjaService.createEmail({
      projekti: projektiInDB,
      asiakirjaTyyppi: AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU,
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
