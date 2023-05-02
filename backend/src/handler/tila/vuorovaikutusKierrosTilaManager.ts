import { Kieli, NykyinenKayttaja, PDF, VuorovaikutusKierrosTila } from "../../../../common/graphql/apiModel";
import { TilaManager } from "./TilaManager";
import {
  DBProjekti,
  IlmoituksenVastaanottajat,
  Kielitiedot,
  SaameKieli,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
  VuorovaikutusPDF,
} from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { fileService } from "../../files/fileService";
import { localDateTimeString, parseDate } from "../../util/dateUtil";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import { pdfGeneratorClient } from "../../asiakirja/lambda/pdfGeneratorClient";
import { asiakirjaEmailService } from "../../asiakirja/asiakirjaEmailService";
import assert from "assert";
import { emailClient } from "../../email/email";
import { requirePermissionMuokkaa } from "../../user";
import { projektiPaallikkoJaVarahenkilotEmails } from "../../email/emailTemplates";
import { assertIsDefined } from "../../util/assertions";
import { isKieliSaame, isKieliTranslatable, KaannettavaKieli } from "../../../../common/kaannettavatKielet";
import { examineEmailSentResults } from "../emailHandler";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { isOkToMakeNewVuorovaikutusKierros } from "../../util/validation";

class VuorovaikutusKierrosTilaManager extends TilaManager<VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu> {
  validateUudelleenkuulutus(): void {
    throw new Error("validateUudelleenkuulutus ei kuulu vuorovaikutuskierroksen toimintoihin");
  }

  checkPriviledgesLisaaKierros(projekti: DBProjekti): NykyinenKayttaja {
    return requirePermissionMuokkaa(projekti);
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

  validateLisaaKierros(projekti: DBProjekti): void {
    if (projekti.vuorovaikutusKierros?.tila == VuorovaikutusKierrosTila.MUOKATTAVISSA) {
      throw new IllegalArgumentError(
        "Et voi luoda uutta vuorovaikutuskierrosta, koska viimeisin vuorovaikutuskierros on vielä julkaisematta"
      );
    }
    if (!isOkToMakeNewVuorovaikutusKierros(projekti)) {
      throw new IllegalArgumentError(
        "Et voi luoda uutta vuorovaikutuskierrosta, koska viimeisin julkaistu vuorovaikutus ei ole vielä päättynyt, tai koska ollaan jo nähtävilläolovaiheessa"
      );
    }
  }

  async lisaaUusiKierros(projekti: DBProjekti): Promise<void> {
    await projektiDatabase.saveProjektiWithoutLocking({
      oid: projekti.oid,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: (projekti.vuorovaikutusKierros?.vuorovaikutusNumero || 0) + 1,
        tila: VuorovaikutusKierrosTila.MUOKATTAVISSA,
      },
    });
  }

  async approve(projekti: DBProjekti, _muokkaaja: NykyinenKayttaja): Promise<void> {
    const vuorovaikutusKierrosJulkaisu = asiakirjaAdapter.adaptVuorovaikutusKierrosJulkaisu(projekti);

    if (!vuorovaikutusKierrosJulkaisu.hankkeenKuvaus) {
      throw new IllegalArgumentError("Vuorovaikutuskierroksella tulee olla hankkeenKuvaus!");
    }
    if (!vuorovaikutusKierrosJulkaisu.ilmoituksenVastaanottajat) {
      throw new IllegalArgumentError("Vuorovaikutuskierroksella on oltava ilmoituksenVastaanottajat!");
    }

    validateSaamePDFsExistIfRequired(projekti.kielitiedot?.toissijainenKieli, vuorovaikutusKierrosJulkaisu);

    const sentMessageInfo = await this.saveJulkaisuGeneratePDFsAndSendEmails(projekti, vuorovaikutusKierrosJulkaisu);

    const aikaleima = localDateTimeString();
    vuorovaikutusKierrosJulkaisu.ilmoituksenVastaanottajat?.kunnat?.map((kunta) =>
      examineEmailSentResults(kunta, sentMessageInfo, aikaleima)
    );
    vuorovaikutusKierrosJulkaisu.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) =>
      examineEmailSentResults(viranomainen, sentMessageInfo, aikaleima)
    );
    const oid = projekti.oid;
    await projektiDatabase.saveProjektiWithoutLocking({
      oid,
      vuorovaikutusKierros: {
        ...projekti.vuorovaikutusKierros,
        vuorovaikutusNumero: projekti.vuorovaikutusKierros?.vuorovaikutusNumero || 0,
        tila: VuorovaikutusKierrosTila.JULKINEN,
      },
    });
    await projektiDatabase.vuorovaikutusKierrosJulkaisut.update(projekti, vuorovaikutusKierrosJulkaisu);

    await this.synchronizeProjektiFiles(oid, vuorovaikutusKierrosJulkaisu.vuorovaikutusJulkaisuPaiva);
  }

  async reject(_projekti: DBProjekti, _syy: string): Promise<void> {
    throw new IllegalArgumentError("Reject ei kuulu vuorovaikutuskierroksen toimintoihin");
  }

  async uudelleenkuuluta(_projekti: DBProjekti): Promise<void> {
    throw new IllegalArgumentError("Uudelleenkuuluta ei kuulu vuorovaikutuskierroksen toimintoihin");
  }

  private async generatePDFsForLanguage(
    kieli: KaannettavaKieli,
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
    assert(
      isKieliTranslatable(kielitiedot.ensisijainenKieli),
      "ensisijaisen kielen on oltava käännettävä kieli, esim. saame ei ole sallittu"
    );
    const { kutsuPDFPath } = await this.generatePDFsForLanguage(kielitiedot.ensisijainenKieli as KaannettavaKieli, julkaisu, projekti);
    julkaisu.vuorovaikutusPDFt = {};
    julkaisu.vuorovaikutusPDFt[kielitiedot.ensisijainenKieli] = { kutsuPDFPath };

    if (isKieliTranslatable(kielitiedot.toissijainenKieli)) {
      const { kutsuPDFPath: pdfToissijainen } = await this.generatePDFsForLanguage(
        kielitiedot.toissijainenKieli as KaannettavaKieli,
        julkaisu,
        projekti
      );
      julkaisu.vuorovaikutusPDFt[kielitiedot.toissijainenKieli as KaannettavaKieli] = { kutsuPDFPath: pdfToissijainen };
    }
  }

  private async saveJulkaisuGeneratePDFsAndSendEmails(
    projekti: DBProjekti,
    julkaisu: VuorovaikutusKierrosJulkaisu
  ): Promise<SMTPTransport.SentMessageInfo | undefined> {
    if (!projekti.kielitiedot) {
      throw new Error("projekti.kielitiedot puuttuu!");
    }
    const kielitiedot: Kielitiedot = projekti.kielitiedot;
    const attachments = [];
    julkaisu.vuorovaikutusPDFt = {};
    assert(
      isKieliTranslatable(kielitiedot.ensisijainenKieli),
      "ensisijaisen kielen on oltava käännettävä kieli, esim. saame ei ole sallittu"
    );
    const pdfEnsisijainen = await this.generatePDFsForLanguage(kielitiedot.ensisijainenKieli as KaannettavaKieli, julkaisu, projekti);
    julkaisu.vuorovaikutusPDFt[kielitiedot.ensisijainenKieli] = { kutsuPDFPath: pdfEnsisijainen.kutsuPDFPath };
    attachments.push(asiakirjaEmailService.createPDFAttachment(pdfEnsisijainen));

    if (isKieliTranslatable(kielitiedot.toissijainenKieli)) {
      const pdfToissijainen = await this.generatePDFsForLanguage(kielitiedot.toissijainenKieli as KaannettavaKieli, julkaisu, projekti);
      julkaisu.vuorovaikutusPDFt[kielitiedot.toissijainenKieli as KaannettavaKieli] = { kutsuPDFPath: pdfToissijainen.kutsuPDFPath };
      attachments.push(asiakirjaEmailService.createPDFAttachment(pdfToissijainen));
    }
    await projektiDatabase.vuorovaikutusKierrosJulkaisut.insert(projekti.oid, julkaisu);

    assert(projekti.velho && kielitiedot && julkaisu.ilmoituksenVastaanottajat);
    assert(
      isKieliTranslatable(projekti.kielitiedot.ensisijainenKieli),
      "ensisijaisen kielen on oltava käännettävä kieli, esim. saame ei ole sallittu"
    );
    const emailOptions = asiakirjaEmailService.createYleisotilaisuusKutsuEmail({
      oid: projekti.oid,
      lyhytOsoite: projekti.lyhytOsoite,
      kayttoOikeudet: projekti.kayttoOikeudet,
      kielitiedot,
      velho: projekti.velho,
      suunnitteluSopimus: projekti.suunnitteluSopimus || undefined,
      vuorovaikutusKierrosJulkaisu: julkaisu,
      kieli: projekti.kielitiedot.ensisijainenKieli as KaannettavaKieli,
      luonnos: false,
    });
    emailOptions.attachments = attachments;

    const recipients = this.collectRecipients(julkaisu.ilmoituksenVastaanottajat);
    const cc = projekti.kayttoOikeudet && projektiPaallikkoJaVarahenkilotEmails(projekti.kayttoOikeudet);

    return await emailClient.sendEmail({ ...emailOptions, to: recipients, cc });
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

  getVaihe(projekti: DBProjekti): VuorovaikutusKierros {
    assertIsDefined(projekti.vuorovaikutusKierros);
    return projekti.vuorovaikutusKierros;
  }
}

async function createVuorovaikutusKierrosPDF(
  julkaisu: VuorovaikutusKierrosJulkaisu,
  projekti: DBProjekti,
  kieli: KaannettavaKieli
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
    lyhytOsoite: projekti.lyhytOsoite,
    velho: projekti.velho,
    kielitiedot: projekti.kielitiedot,
    suunnitteluSopimus: projekti.suunnitteluSopimus || undefined,
    vuorovaikutusKierrosJulkaisu: julkaisu,
    kieli,
    luonnos: false,
    kayttoOikeudet: projekti.kayttoOikeudet,
    euRahoitusLogot: projekti.euRahoitusLogot,
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

function validateSaamePDFsExistIfRequired(toissijainenKieli: Kieli | undefined, vaihe: VuorovaikutusKierrosJulkaisu) {
  if (isKieliSaame(toissijainenKieli)) {
    assertIsDefined(toissijainenKieli);
    const saamePDFt = vaihe?.vuorovaikutusSaamePDFt?.[toissijainenKieli as unknown as SaameKieli];
    if (saamePDFt) {
      if (!saamePDFt) {
        throw new IllegalArgumentError("Saamenkielinen kutsu-PDF puuttuu");
      }
    }
  }
}

export const vuorovaikutusKierrosTilaManager = new VuorovaikutusKierrosTilaManager();
