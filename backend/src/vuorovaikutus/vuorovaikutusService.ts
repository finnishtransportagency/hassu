import { findVuorovaikutusByNumber } from "../util/findVuorovaikutusByNumber";
import * as API from "../../../common/graphql/apiModel";
import { DBProjekti, IlmoituksenVastaanottajat, Vuorovaikutus } from "../database/model";
import { fileService } from "../files/fileService";
import { projektiDatabase } from "../database/projektiDatabase";
import { emailClient } from "../email/email";
import { ProjektiPaths } from "../files/ProjektiPath";
import assert from "assert";
import { pdfGeneratorClient } from "../asiakirja/lambda/pdfGeneratorClient";
import { AsiakirjanMuoto, determineAsiakirjaMuoto } from "../asiakirja/asiakirjaTypes";
import { asiakirjaEmailService } from "../asiakirja/asiakirjaEmailService";

async function generateKutsuPDF(
  oid: string,
  projektiInDB: DBProjekti,
  vuorovaikutus: Vuorovaikutus,
  kieli: API.Kieli,
  vuorovaikutusKutsuPath: string
) {
  const velho = projektiInDB.velho;
  const kielitiedot = projektiInDB.kielitiedot;
  const suunnitteluVaihe = projektiInDB.suunnitteluVaihe;
  assert(velho && kielitiedot && suunnitteluVaihe);

  const asiakirjanMuoto: AsiakirjanMuoto | undefined = determineAsiakirjaMuoto(velho.tyyppi, velho.vaylamuoto);
  const pdf = await pdfGeneratorClient.createYleisotilaisuusKutsuPdf({
    oid: projektiInDB.oid,
    kayttoOikeudet: projektiInDB.kayttoOikeudet,
    velho,
    suunnitteluSopimus: projektiInDB.suunnitteluSopimus || undefined,
    kielitiedot,
    suunnitteluVaihe,
    asiakirjanMuoto,
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
  async handleVuorovaikutusKutsu(oid: string, vuorovaikutusNumero: number): Promise<void> {
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
    attachments.push(asiakirjaEmailService.createPDFAttachment(pdfEnsisijainen));

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
      attachments.push(asiakirjaEmailService.createPDFAttachment(pdfToissijainen));
    }

    await projektiDatabase.saveProjekti({ oid, vuorovaikutukset: [vuorovaikutus] });

    const suunnitteluSopimus = projektiInDB.suunnitteluSopimus;
    const velho = projektiInDB.velho;
    const kielitiedot = projektiInDB.kielitiedot;
    const suunnitteluVaihe = projektiInDB.suunnitteluVaihe;
    assert(velho && kielitiedot && suunnitteluVaihe);
    const asiakirjanMuoto: AsiakirjanMuoto | undefined = determineAsiakirjaMuoto(velho.tyyppi, velho.vaylamuoto);
    const emailOptions = asiakirjaEmailService.createYleisotilaisuusKutsuEmail({
      oid,
      kayttoOikeudet: projektiInDB.kayttoOikeudet,
      asiakirjanMuoto,
      kielitiedot,
      velho,
      suunnitteluSopimus: suunnitteluSopimus || undefined,
      suunnitteluVaihe,
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
