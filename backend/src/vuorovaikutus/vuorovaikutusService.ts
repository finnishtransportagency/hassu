import { findVuorovaikutusByNumber } from "../util/findVuorovaikutusByNumber";
import * as API from "../../../common/graphql/apiModel";
import { IlmoituksenVastaanottajat, DBProjekti, Vuorovaikutus } from "../database/model";
import { asiakirjaService } from "../asiakirja/asiakirjaService";
import { fileService } from "../files/fileService";
import { projektiDatabase } from "../database/projektiDatabase";
import { emailClient } from "../email/email";
import { ProjektiPaths } from "../files/ProjektiPath";

async function generateKutsuPDF(
  oid: string,
  projektiInDB: DBProjekti,
  vuorovaikutus: Vuorovaikutus,
  kieli: API.Kieli,
  vuorovaikutusKutsuPath: string
) {
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
class VuorovaikutusService {
  async handleVuorovaikutusKutsu(oid: string, vuorovaikutusNumero: number) {
    // Generate invitation PDF
    const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
    if (!projektiInDB) {
      throw new Error(`handleVuorovaikutsuKutsu: projektia oid:lla ${oid} ei löydy hassusta`);
    }
    const vuorovaikutus = findVuorovaikutusByNumber(projektiInDB, vuorovaikutusNumero);
    if (!vuorovaikutus) {
      throw new Error(`handleVuorovaikutsuKutsu: projektille oid:lla ${oid} ei löydy vuorovaikutusta nro ${vuorovaikutusNumero}`);
    }
    if (!vuorovaikutus.ilmoituksenVastaanottajat) {
      throw new Error(
        `handleVuorovaikutsuKutsu: projektille oid:lla ${oid} ei löydy vuorovaikutuksen nro ${vuorovaikutusNumero} arvoa ilmoituksenVastaanottajat`
      );
    }
    if (!projektiInDB.kielitiedot) {
      throw new Error(`handleVuorovaikutsuKutsu: projektille oid:lla ${oid} ei löydy kielitietoja`);
    }
    const vuorovaikutusKutsuPath: string = new ProjektiPaths(oid).vuorovaikutus(vuorovaikutus).yllapitoPath + "/kutsu";

    const attachments = [];

    const pdfEnsisijainen = await generateKutsuPDF(
      oid,
      projektiInDB,
      vuorovaikutus,
      projektiInDB.kielitiedot.ensisijainenKieli,
      vuorovaikutusKutsuPath
    );
    vuorovaikutus.vuorovaikutusPDFt = {};
    vuorovaikutus.vuorovaikutusPDFt[projektiInDB.kielitiedot.ensisijainenKieli] = {
      kutsuPDFPath: pdfEnsisijainen.fullFilePathInProjekti,
    };
    attachments.push(asiakirjaService.createPDFAttachment(pdfEnsisijainen));

    if (projektiInDB.kielitiedot.toissijainenKieli) {
      const pdfToissijainen = await generateKutsuPDF(
        oid,
        projektiInDB,
        vuorovaikutus,
        projektiInDB.kielitiedot.toissijainenKieli,
        vuorovaikutusKutsuPath
      );
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
    if (!ilmoituksenVastaanottajat.kunnat) {
      throw new Error("handleVuorovaikutusKutsu: ilmoituksenVastaanottajat.kunnat ei määritelty");
    }
    if (!ilmoituksenVastaanottajat.viranomaiset) {
      throw new Error("handleVuorovaikutusKutsu: ilmoituksenVastaanottajat.viranomaiset ei määritelty");
    }
    return ([] as string[])
      .concat(ilmoituksenVastaanottajat.kunnat.map((kunta) => kunta.sahkoposti))
      .concat(ilmoituksenVastaanottajat.viranomaiset?.map((viranomainen) => viranomainen.sahkoposti))
      .filter((s) => s);
  }
}

export const vuorovaikutusService = new VuorovaikutusService();
