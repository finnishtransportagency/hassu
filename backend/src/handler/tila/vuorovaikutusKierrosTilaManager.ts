import { Kieli, NykyinenKayttaja, PDF, VuorovaikutusKierrosTila } from "../../../../common/graphql/apiModel";
import { TilaManager } from "./TilaManager";
import {
  DBProjekti,
  IlmoituksenVastaanottajat,
  Kielitiedot,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
  VuorovaikutusPDF,
} from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { fileService } from "../../files/fileService";
import { parseDate } from "../../util/dateUtil";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import { pdfGeneratorClient } from "../../asiakirja/lambda/pdfGeneratorClient";
import { asiakirjaEmailService } from "../../asiakirja/asiakirjaEmailService";
import assert from "assert";
import { emailClient } from "../../email/email";
import { requirePermissionMuokkaa } from "../../user";

class VuorovaikutusKierrosTilaManager extends TilaManager<VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu> {
  validateUudelleenkuulutus(): void {
    throw new Error("validateUudelleenkuulutus ei kuulu vuorovaikutuskierroksen toimintoihin");
  }

  validateSendForApproval(): void {
    throw new Error("validateSendForApproval ei kuulu vuorovaikutuskierroksen toimintoihin");
  }

  checkPriviledgesApproveReject(projekti: DBProjekti): NykyinenKayttaja {
    return requirePermissionMuokkaa(projekti);
  }

  checkPriviledgesSendForApproval(_projekti: DBProjekti): NykyinenKayttaja {
    throw new Error("checkPriviledgesSendForApproval ei kuulu vuorovaikutuskierroksen toimintoihin");
  }

  checkUudelleenkuulutusPriviledges(_projekti: DBProjekti): NykyinenKayttaja {
    throw new Error("checkUudelleenkuulutusPriviledges ei kuulu vuorovaikutuskierroksen toimintoihin");
  }

  async sendForApproval(_projekti: DBProjekti, _muokkaaja: NykyinenKayttaja): Promise<void> {
    throw new Error("sendForApproval ei kuulu vuorovaikutuskierroksen toimintoihin");
  }

  async approve(projekti: DBProjekti, _muokkaaja: NykyinenKayttaja): Promise<void> {
    const vuorovaikutusKierrosJulkaisu = asiakirjaAdapter.adaptVuorovaikutusKierrosJulkaisu(projekti);

    if (!vuorovaikutusKierrosJulkaisu.hankkeenKuvaus) {
      throw new IllegalArgumentError("Vuorovaikutuskierroksella tulee olla hankkeenKuvaus!");
    }
    if (!vuorovaikutusKierrosJulkaisu.ilmoituksenVastaanottajat) {
      throw new IllegalArgumentError("Vuorovaikutuskierroksella on oltava ilmoituksenVastaanottajat!");
    }

    await this.saveJulkaisuGeneratePDFsAndSendEmails(projekti, vuorovaikutusKierrosJulkaisu);

    await projektiDatabase.saveProjektiWithoutLocking({
      oid: projekti.oid,
      vuorovaikutusKierros: {
        ...projekti.vuorovaikutusKierros,
        vuorovaikutusNumero: projekti.vuorovaikutusKierros?.vuorovaikutusNumero || 0,
        tila: VuorovaikutusKierrosTila.JULKINEN,
      },
    });
    await this.synchronizeProjektiFiles(projekti.oid, vuorovaikutusKierrosJulkaisu.vuorovaikutusJulkaisuPaiva);
  }

  async reject(_projekti: DBProjekti, _syy: string): Promise<void> {
    throw new IllegalArgumentError("Reject ei kuulu vuorovaikutuskierroksen toimintoihin");
  }

  async uudelleenkuuluta(_projekti: DBProjekti): Promise<void> {
    throw new IllegalArgumentError("Uudelleenkuuluta ei kuulu vuorovaikutuskierroksen toimintoihin");
  }

  private async generatePDFsForLanguage(
    kieli: Kieli,
    julkaisu: VuorovaikutusKierrosJulkaisu,
    projekti: DBProjekti
  ): Promise<VuorovaikutusPDF & PDF> {
    const { fullFilePathInProjekti, nimi, sisalto } = await createVuorovaikutusKierrosPDF(julkaisu, projekti, kieli);

    return { __typename: "PDF", kutsuPDFPath: await fullFilePathInProjekti, nimi, sisalto };
  }

  async generatePDFsForJulkaisu(julkaisu: VuorovaikutusKierrosJulkaisu, projekti: DBProjekti): Promise<void> {
    if (!projekti.kielitiedot) {
      throw new Error("projekti.kielitiedot puuttuu!");
    }

    const kielitiedot: Kielitiedot = projekti.kielitiedot;
    const { kutsuPDFPath } = await this.generatePDFsForLanguage(kielitiedot.ensisijainenKieli, julkaisu, projekti);
    julkaisu.vuorovaikutusPDFt = {};
    julkaisu.vuorovaikutusPDFt[kielitiedot.ensisijainenKieli] = { kutsuPDFPath };

    if (kielitiedot.toissijainenKieli) {
      const { kutsuPDFPath: pdfToissijainen } = await this.generatePDFsForLanguage(kielitiedot.toissijainenKieli, julkaisu, projekti);
      julkaisu.vuorovaikutusPDFt[kielitiedot.toissijainenKieli] = { kutsuPDFPath: pdfToissijainen };
    }
  }

  private async saveJulkaisuGeneratePDFsAndSendEmails(projekti: DBProjekti, julkaisu: VuorovaikutusKierrosJulkaisu): Promise<void> {
    if (!projekti.kielitiedot) {
      throw new Error("projekti.kielitiedot puuttuu!");
    }
    const kielitiedot: Kielitiedot = projekti.kielitiedot;
    const attachments = [];
    julkaisu.vuorovaikutusPDFt = {};
    const pdfEnsisijainen = await this.generatePDFsForLanguage(kielitiedot.ensisijainenKieli, julkaisu, projekti);
    julkaisu.vuorovaikutusPDFt[kielitiedot.ensisijainenKieli] = pdfEnsisijainen;
    attachments.push(asiakirjaEmailService.createPDFAttachment(pdfEnsisijainen));

    if (kielitiedot.toissijainenKieli) {
      julkaisu.vuorovaikutusPDFt[kielitiedot.toissijainenKieli] = await this.generatePDFsForLanguage(
        kielitiedot.toissijainenKieli,
        julkaisu,
        projekti
      );
      attachments.push(asiakirjaEmailService.createPDFAttachment(pdfEnsisijainen));
    }
    await projektiDatabase.vuorovaikutusKierrosJulkaisut.insert(projekti.oid, julkaisu);

    assert(projekti.velho && kielitiedot && julkaisu.ilmoituksenVastaanottajat);
    const emailOptions = asiakirjaEmailService.createYleisotilaisuusKutsuEmail({
      oid: projekti.oid,
      kayttoOikeudet: projekti.kayttoOikeudet,
      kielitiedot,
      velho: projekti.velho,
      suunnitteluSopimus: projekti.suunnitteluSopimus || undefined,
      vuorovaikutusKierrosJulkaisu: julkaisu,
      kieli: projekti.kielitiedot.ensisijainenKieli,
      luonnos: false,
    });
    emailOptions.attachments = attachments;

    const recipients = this.collectRecipients(julkaisu.ilmoituksenVastaanottajat);
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

  getProjektiPathForKuulutus(projekti: DBProjekti, kierros: VuorovaikutusKierros) {
    return new ProjektiPaths(projekti.oid).vuorovaikutus(kierros);
  }

  async saveVaihe(projekti: DBProjekti, vuorovaikutusKierros: VuorovaikutusKierros) {
    await projektiDatabase.saveProjekti({
      oid: projekti.oid,
      versio: projekti.versio,
      vuorovaikutusKierros,
    });
  }
}

async function createVuorovaikutusKierrosPDF(
  julkaisu: VuorovaikutusKierrosJulkaisu,
  projekti: DBProjekti,
  kieli: Kieli
): Promise<{ fullFilePathInProjekti: Promise<string>; __typename: "PDF"; nimi: string; sisalto: string; textContent: string }> {
  if (!julkaisu.vuorovaikutusJulkaisuPaiva) {
    throw new Error("julkaisuWaitingForApproval.kuulutusPaiva ei määritelty");
  }
  if (!projekti.velho) {
    throw new Error("Projekti.velho määrittelemättä!");
  }
  if (!projekti.kielitiedot) {
    throw new Error("Projekti.kielitiedot määrittelemättä!");
  }
  const pdf = await pdfGeneratorClient.createYleisotilaisuusKutsuPdf({
    oid: projekti.oid,
    velho: projekti.velho,
    kielitiedot: projekti.kielitiedot,
    suunnitteluSopimus: projekti.suunnitteluSopimus || undefined,
    vuorovaikutusKierrosJulkaisu: julkaisu,
    kieli,
    luonnos: false,
    kayttoOikeudet: projekti.kayttoOikeudet,
  });

  const fullFilePathInProjekti = fileService.createFileToProjekti({
    oid: projekti.oid,
    path: new ProjektiPaths(projekti.oid).vuorovaikutus(julkaisu),
    fileName: pdf.nimi,
    contents: Buffer.from(pdf.sisalto, "base64"),
    inline: true,
    contentType: "application/pdf",
    publicationTimestamp: parseDate(julkaisu.vuorovaikutusJulkaisuPaiva),
  });
  return { ...pdf, fullFilePathInProjekti };
}

export const vuorovaikutusKierrosTilaManager = new VuorovaikutusKierrosTilaManager();
