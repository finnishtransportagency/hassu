import { AsiakirjaTyyppi, Kieli, KuulutusJulkaisuTila, NykyinenKayttaja, Status } from "../../../../common/graphql/apiModel";
import { projektiDatabase } from "../../database/projektiDatabase";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import {
  AloitusKuulutus,
  AloitusKuulutusJulkaisu,
  AloitusKuulutusPDF,
  DBProjekti,
  Kielitiedot,
  LocalizedMap,
  SaameKieli,
} from "../../database/model";
import { fileService } from "../../files/fileService";
import { parseDate } from "../../util/dateUtil";
import { KuulutusTilaManager } from "./KuulutusTilaManager";
import { pdfGeneratorClient } from "../../asiakirja/lambda/pdfGeneratorClient";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import { projektiAdapter } from "../../projekti/adapter/projektiAdapter";
import assert from "assert";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { ProjektiAineistoManager } from "../../aineisto/projektiAineistoManager";
import { requireAdmin, requireOmistaja, requirePermissionMuokkaa } from "../../user/userService";
import { sendAloitusKuulutusApprovalMailsAndAttachments, sendWaitingApprovalMail } from "../emailHandler";
import { IllegalAineistoStateError } from "../../error/IllegalAineistoStateError";
import { assertIsDefined } from "../../util/assertions";
import { isKieliSaame, isKieliTranslatable, KaannettavaKieli } from "../../../../common/kaannettavatKielet";

async function createAloituskuulutusPDF(
  asiakirjaTyyppi: AsiakirjaTyyppi,
  julkaisuWaitingForApproval: AloitusKuulutusJulkaisu,
  projekti: DBProjekti,
  kieli: KaannettavaKieli
) {
  if (!julkaisuWaitingForApproval.kuulutusPaiva) {
    throw new Error("julkaisuWaitingForApproval.kuulutusPaiva ei määritelty");
  }
  const pdf = await pdfGeneratorClient.createAloituskuulutusPdf({
    oid: projekti.oid,
    lyhytOsoite: projekti.lyhytOsoite,
    asiakirjaTyyppi,
    aloitusKuulutusJulkaisu: julkaisuWaitingForApproval,
    kieli,
    luonnos: false,
    kayttoOikeudet: projekti.kayttoOikeudet,
    euRahoitusLogot: projekti.euRahoitusLogot,
  });

  return fileService.createFileToProjekti({
    oid: projekti.oid,
    path: new ProjektiPaths(projekti.oid).aloituskuulutus(julkaisuWaitingForApproval),
    fileName: pdf.nimi,
    contents: Buffer.from(pdf.sisalto, "base64"),
    inline: true,
    contentType: "application/pdf",
    publicationTimestamp: parseDate(julkaisuWaitingForApproval.kuulutusPaiva),
  });
}

async function cleanupAloitusKuulutusBeforeApproval(projekti: DBProjekti, aloitusKuulutus: AloitusKuulutus) {
  if (aloitusKuulutus.palautusSyy) {
    aloitusKuulutus.palautusSyy = null;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, aloitusKuulutus });
  }
}

function validateSaamePDFsExistIfRequired(toissijainenKieli: Kieli | undefined, vaihe: AloitusKuulutus) {
  if (isKieliSaame(toissijainenKieli)) {
    assertIsDefined(toissijainenKieli);
    const saamePDFt = vaihe?.aloituskuulutusSaamePDFt?.[toissijainenKieli as unknown as SaameKieli];
    if (saamePDFt) {
      if (!saamePDFt.kuulutusIlmoitusPDF || !saamePDFt.kuulutusPDF) {
        throw new IllegalArgumentError("Saamenkieliset PDFt puuttuvat");
      }
    }
  }
}

class AloitusKuulutusTilaManager extends KuulutusTilaManager<AloitusKuulutus, AloitusKuulutusJulkaisu> {
  getUpdatedAineistotForVaihe(
    aloituskuulutus: AloitusKuulutus,
    id: number,
    paths: ProjektiPaths
  ): Pick<AloitusKuulutus, "aloituskuulutusSaamePDFt"> {
    const oldPathPrefix = paths.aloituskuulutus(aloituskuulutus).yllapitoPath;
    const newPathPrefix = paths.aloituskuulutus({ ...aloituskuulutus, id }).yllapitoPath;
    const aloituskuulutusSaamePDFt = this.updateKuulutusSaamePDFtForUudelleenkuulutus(
      aloituskuulutus.aloituskuulutusSaamePDFt,
      oldPathPrefix,
      newPathPrefix
    );

    return { aloituskuulutusSaamePDFt };
  }

  getKuulutusWaitingForApproval(projekti: DBProjekti): AloitusKuulutusJulkaisu | undefined {
    return asiakirjaAdapter.findAloitusKuulutusWaitingForApproval(projekti);
  }

  validateSendForApproval(projekti: DBProjekti): void {
    const vaihe = this.getVaihe(projekti);
    validateSaamePDFsExistIfRequired(projekti.kielitiedot?.toissijainenKieli, vaihe);

    if (!new ProjektiAineistoManager(projekti).getAloitusKuulutusVaihe().isReady()) {
      throw new IllegalAineistoStateError();
    }
  }

  async sendApprovalMailsAndAttachments(oid: string): Promise<void> {
    await sendAloitusKuulutusApprovalMailsAndAttachments(oid);
  }

  async updateJulkaisu(projekti: DBProjekti, julkaisu: AloitusKuulutusJulkaisu): Promise<void> {
    await projektiDatabase.aloitusKuulutusJulkaisut.update(projekti, julkaisu);
  }

  validateUudelleenkuulutus(projekti: DBProjekti, kuulutus: AloitusKuulutus, hyvaksyttyJulkaisu: AloitusKuulutusJulkaisu | undefined) {
    // Tarkista, että on olemassa hyväksytty aloituskuulutusjulkaisu, jonka perua
    if (!hyvaksyttyJulkaisu) {
      throw new IllegalArgumentError("Ei ole olemassa kuulutusta, jota uudelleenkuuluttaa");
    }
    // Aloituskuulutuksen uudelleenkuuluttaminen on mahdollista vain jos projekti on ylläpidossa suunnitteluvaiheessa
    const apiProjekti = projektiAdapter.adaptProjekti(projekti);
    if (apiProjekti.status !== Status.SUUNNITTELU) {
      throw new IllegalArgumentError("Et voi uudelleenkuuluttaa aloistuskuulutusta projektin ollessa tässä tilassa:" + apiProjekti.status);
    }
    assert(kuulutus, "Projektilla pitäisi olla aloituskuulutus, jos se on suunnittelutilassa");
    // Uudelleenkuulutus ei ole mahdollista jos uudelleenkuulutus on jo olemassa
    if (kuulutus.uudelleenKuulutus) {
      throw new IllegalArgumentError("Et voi uudelleenkuuluttaa aloistuskuulutusta, koska uudelleenkuulutus on jo olemassa");
    }
  }

  getVaihe(projekti: DBProjekti): AloitusKuulutus {
    const aloitusKuulutus = projekti.aloitusKuulutus;
    if (!aloitusKuulutus) {
      throw new IllegalArgumentError("Projektilla ei ole aloituskuulutusta");
    }
    return aloitusKuulutus;
  }

  getJulkaisut(projekti: DBProjekti) {
    return projekti.aloitusKuulutusJulkaisut || undefined;
  }

  checkPriviledgesApproveReject(projekti: DBProjekti): NykyinenKayttaja {
    return requireOmistaja(projekti, "hyväksy tai hylkää julkaisu");
  }

  checkPriviledgesSendForApproval(projekti: DBProjekti): NykyinenKayttaja {
    return requirePermissionMuokkaa(projekti);
  }

  checkUudelleenkuulutusPriviledges(_projekti: DBProjekti): NykyinenKayttaja {
    return requireAdmin();
  }

  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findAloitusKuulutusWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("Aloituskuulutus on jo olemassa odottamassa hyväksyntää");
    }

    const aloitusKuulutus = this.getVaihe(projekti);
    await cleanupAloitusKuulutusBeforeApproval(projekti, aloitusKuulutus);

    const aloitusKuulutusJulkaisu = asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti);
    aloitusKuulutusJulkaisu.tila = KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA;
    aloitusKuulutusJulkaisu.muokkaaja = muokkaaja.uid;

    await this.generatePDFs(projekti, aloitusKuulutusJulkaisu);
    await projektiDatabase.aloitusKuulutusJulkaisut.insert(projekti.oid, aloitusKuulutusJulkaisu);
    await sendWaitingApprovalMail(projekti);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisuWaitingForApproval: AloitusKuulutusJulkaisu | undefined =
      asiakirjaAdapter.findAloitusKuulutusWaitingForApproval(projekti);
    if (!julkaisuWaitingForApproval) {
      throw new Error("Ei aloituskuulutusta odottamassa hyväksyntää");
    }

    const aloitusKuulutus = this.getVaihe(projekti);
    aloitusKuulutus.palautusSyy = syy;
    if (julkaisuWaitingForApproval.aloituskuulutusPDFt) {
      await this.deletePDFs(projekti.oid, julkaisuWaitingForApproval.aloituskuulutusPDFt);
    }
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, aloitusKuulutus });
    await projektiDatabase.aloitusKuulutusJulkaisut.delete(projekti, julkaisuWaitingForApproval.id);
  }

  private async generatePDFs(projekti: DBProjekti, julkaisuWaitingForApproval: AloitusKuulutusJulkaisu) {
    assertIsDefined(julkaisuWaitingForApproval.kielitiedot);
    const kielitiedot: Kielitiedot = julkaisuWaitingForApproval.kielitiedot;

    async function generatePDFsForLanguage(kieli: KaannettavaKieli, julkaisu: AloitusKuulutusJulkaisu): Promise<AloitusKuulutusPDF> {
      const aloituskuulutusPDFPath = await createAloituskuulutusPDF(AsiakirjaTyyppi.ALOITUSKUULUTUS, julkaisu, projekti, kieli);
      const aloituskuulutusIlmoitusPDFPath = await createAloituskuulutusPDF(
        AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA,
        julkaisu,
        projekti,
        kieli
      );
      return { aloituskuulutusPDFPath, aloituskuulutusIlmoitusPDFPath };
    }

    julkaisuWaitingForApproval.aloituskuulutusPDFt = {};
    assert(
      isKieliTranslatable(kielitiedot.ensisijainenKieli),
      "ensisijaisen kielen on oltava käännettävä kieli, esim. saame ei ole sallittu"
    );
    julkaisuWaitingForApproval.aloituskuulutusPDFt[kielitiedot.ensisijainenKieli] = await generatePDFsForLanguage(
      kielitiedot.ensisijainenKieli,
      julkaisuWaitingForApproval
    );

    if (isKieliTranslatable(kielitiedot.toissijainenKieli)) {
      julkaisuWaitingForApproval.aloituskuulutusPDFt[kielitiedot.toissijainenKieli] = await generatePDFsForLanguage(
        kielitiedot.toissijainenKieli,
        julkaisuWaitingForApproval
      );
    }
  }

  private async deletePDFs(oid: string, localizedPDFs: LocalizedMap<AloitusKuulutusPDF>) {
    for (const language in localizedPDFs) {
      // localizedPDFs ei ole null, ja language on tyyppiä Kieli, joka on localizedPDFs:n avain
      assertIsDefined(localizedPDFs[language as Kieli]);
      const pdfs = localizedPDFs[language as Kieli];
      if (pdfs) {
        await fileService.deleteYllapitoFileFromProjekti({
          oid,
          filePathInProjekti: pdfs.aloituskuulutusPDFPath,
          reason: "Aloituskuulutus rejected",
        });
        await fileService.deleteYllapitoFileFromProjekti({
          oid,
          filePathInProjekti: pdfs.aloituskuulutusIlmoitusPDFPath,
          reason: "Aloituskuulutus rejected",
        });
      }
    }
  }

  getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: AloitusKuulutus) {
    return new ProjektiPaths(projekti.oid).aloituskuulutus(kuulutus);
  }

  async saveVaihe(projekti: DBProjekti, vaihe: AloitusKuulutus) {
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, aloitusKuulutus: vaihe });
  }
}

export const aloitusKuulutusTilaManager = new AloitusKuulutusTilaManager();
