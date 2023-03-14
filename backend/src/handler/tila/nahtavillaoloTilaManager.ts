import { AsiakirjaTyyppi, Kieli, KuulutusJulkaisuTila, NykyinenKayttaja } from "../../../../common/graphql/apiModel";
import { KuulutusTilaManager } from "./KuulutusTilaManager";
import { DBProjekti, LocalizedMap, NahtavillaoloPDF, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { fileService } from "../../files/fileService";
import { parseDate } from "../../util/dateUtil";
import { PathTuple, ProjektiPaths } from "../../files/ProjektiPath";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import assert from "assert";
import { pdfGeneratorClient } from "../../asiakirja/lambda/pdfGeneratorClient";
import { NahtavillaoloKuulutusAsiakirjaTyyppi } from "../../asiakirja/asiakirjaTypes";
import { projektiAdapter } from "../../projekti/adapter/projektiAdapter";
import { assertIsDefined } from "../../util/assertions";
import { ProjektiAineistoManager } from "../../aineisto/projektiAineistoManager";
import { requireAdmin, requireOmistaja, requirePermissionMuokkaa } from "../../user/userService";
import { IllegalAineistoStateError } from "../../error/IllegalAineistoStateError";
import { sendNahtavillaKuulutusApprovalMailsAndAttachments } from "../emailHandler";

async function createNahtavillaoloVaihePDF(
  asiakirjaTyyppi: NahtavillaoloKuulutusAsiakirjaTyyppi,
  julkaisu: NahtavillaoloVaiheJulkaisu,
  projekti: DBProjekti,
  kieli: Kieli
) {
  if (!julkaisu.kuulutusPaiva) {
    throw new Error("julkaisu.kuulutusPaiva puuttuu");
  }
  const velho = projekti.velho;
  assert(velho);
  const pdf = await pdfGeneratorClient.createNahtavillaoloKuulutusPdf({
    oid: projekti.oid,
    lyhytOsoite: projekti.lyhytOsoite,
    asiakirjaTyyppi,
    velho,
    suunnitteluSopimus: projekti.suunnitteluSopimus || undefined,
    kayttoOikeudet: projekti.kayttoOikeudet,
    nahtavillaoloVaihe: julkaisu,
    kieli,
    luonnos: false,
    euRahoitusLogot: projekti.euRahoitusLogot,
  });
  return fileService.createFileToProjekti({
    oid: projekti.oid,
    path: new ProjektiPaths(projekti.oid).nahtavillaoloVaihe(julkaisu),
    fileName: pdf.nimi,
    contents: Buffer.from(pdf.sisalto, "base64"),
    inline: true,
    contentType: "application/pdf",
    publicationTimestamp: parseDate(julkaisu.kuulutusPaiva),
  });
}

async function cleanupKuulutusBeforeApproval(projekti: DBProjekti, nahtavillaoloVaihe: NahtavillaoloVaihe) {
  if (nahtavillaoloVaihe.palautusSyy) {
    nahtavillaoloVaihe.palautusSyy = null;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, nahtavillaoloVaihe });
  }
}

class NahtavillaoloTilaManager extends KuulutusTilaManager<NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu> {
  async sendApprovalMailsAndAttachments(oid: string): Promise<void> {
    await sendNahtavillaKuulutusApprovalMailsAndAttachments(oid);
  }

  async updateJulkaisu(projekti: DBProjekti, julkaisu: NahtavillaoloVaiheJulkaisu): Promise<void> {
    await projektiDatabase.nahtavillaoloVaiheJulkaisut.update(projekti, julkaisu);
  }

  getKuulutusWaitingForApproval(projekti: DBProjekti): NahtavillaoloVaiheJulkaisu | undefined {
    return asiakirjaAdapter.findNahtavillaoloWaitingForApproval(projekti);
  }

  getUpdatedAineistotForVaihe(
    nahtavillaoloVaihe: NahtavillaoloVaihe,
    id: number,
    paths: ProjektiPaths
  ): Pick<NahtavillaoloVaihe, "aineistoNahtavilla" | "lisaAineisto"> {
    const oldPathPrefix = paths.nahtavillaoloVaihe(nahtavillaoloVaihe).yllapitoPath;

    const newPathPrefix = paths.nahtavillaoloVaihe({ ...nahtavillaoloVaihe, id }).yllapitoPath;

    const paivitetytAineistoNahtavilla = this.updateAineistoArrayForUudelleenkuulutus(
      nahtavillaoloVaihe.aineistoNahtavilla,
      oldPathPrefix,
      newPathPrefix
    );

    const paivitetytLisaAineisto = this.updateAineistoArrayForUudelleenkuulutus(
      nahtavillaoloVaihe.lisaAineisto,
      oldPathPrefix,
      newPathPrefix
    );

    return { aineistoNahtavilla: paivitetytAineistoNahtavilla, lisaAineisto: paivitetytLisaAineisto };
  }

  validateSendForApproval(projekti: DBProjekti): void {
    if (!new ProjektiAineistoManager(projekti).getNahtavillaoloVaihe().isReady()) {
      throw new IllegalAineistoStateError();
    }
  }

  getVaihe(projekti: DBProjekti): NahtavillaoloVaihe {
    const vaihe = projekti.nahtavillaoloVaihe;
    assertIsDefined(vaihe, "Projektilla ei ole nahtavillaoloVaihetta");
    return vaihe;
  }

  getJulkaisut(projekti: DBProjekti): NahtavillaoloVaiheJulkaisu[] | undefined {
    return projekti.nahtavillaoloVaiheJulkaisut || undefined;
  }

  validateUudelleenkuulutus(
    projekti: DBProjekti,
    kuulutus: NahtavillaoloVaihe,
    hyvaksyttyJulkaisu: NahtavillaoloVaiheJulkaisu | undefined
  ): void {
    // Tarkista, että on olemassa hyväksytty julkaisu, jonka perua
    if (!hyvaksyttyJulkaisu) {
      throw new IllegalArgumentError("Ei ole olemassa kuulutusta, jota uudelleenkuuluttaa");
    }
    // Nähtävilläolovaiheen uudelleenkuuluttaminen on mahdollista vain jos hyväksymispäätöskuulutusjulkaisua ei ole
    const apiProjekti = projektiAdapter.adaptProjekti(projekti);
    const isHyvaksymisPaatosPresent = !!apiProjekti.hyvaksymisPaatosVaiheJulkaisu;
    if (isHyvaksymisPaatosPresent) {
      throw new IllegalArgumentError(
        "Et voi uudelleenkuuluttaa nähtävilläolokuulutusta sillä hyväksymiskuulutus on jo hyväksytty tai se on hyväksyttävänä"
      );
    }
    assert(kuulutus, "Projektilla pitäisi olla nahtavillaolokuulutus, jos sitä uudelleenkuulutetaan");
    // Uudelleenkuulutus ei ole mahdollista jos uudelleenkuulutus on jo olemassa
    if (kuulutus.uudelleenKuulutus) {
      throw new IllegalArgumentError("Et voi uudelleenkuuluttaa nähtävilläolokuulutusta, koska uudelleenkuulutus on jo olemassa");
    }
  }

  getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: NahtavillaoloVaihe | null | undefined): PathTuple {
    return new ProjektiPaths(projekti.oid).nahtavillaoloVaihe(kuulutus);
  }

  async saveVaihe(projekti: DBProjekti, vaihe: NahtavillaoloVaihe): Promise<void> {
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, nahtavillaoloVaihe: vaihe });
  }

  checkPriviledgesApproveReject(projekti: DBProjekti): NykyinenKayttaja {
    return requireOmistaja(projekti, "hyväksy tai hylkää NahtavillaoloVaihe");
  }

  checkPriviledgesSendForApproval(projekti: DBProjekti): NykyinenKayttaja {
    return requirePermissionMuokkaa(projekti);
  }

  checkUudelleenkuulutusPriviledges(_projekti: DBProjekti): NykyinenKayttaja {
    return requireAdmin();
  }

  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findNahtavillaoloWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("Nahtavillaolovaihe on jo olemassa odottamassa hyväksyntää");
    }

    const nahtavillaoloVaihe = this.getVaihe(projekti);

    await cleanupKuulutusBeforeApproval(projekti, nahtavillaoloVaihe);

    const nahtavillaoloVaiheJulkaisu = asiakirjaAdapter.adaptNahtavillaoloVaiheJulkaisu(projekti);
    if (!nahtavillaoloVaiheJulkaisu.aineistoNahtavilla) {
      throw new IllegalArgumentError("Nähtävilläolovaiheella on oltava aineistoNahtavilla!");
    }
    if (!nahtavillaoloVaiheJulkaisu.hankkeenKuvaus) {
      throw new IllegalArgumentError("Nähtävilläolovaiheella tulee olla hankkeenKuvaus!");
    }
    if (!nahtavillaoloVaiheJulkaisu.ilmoituksenVastaanottajat) {
      throw new IllegalArgumentError("Nähtävilläolovaiheella on oltava ilmoituksenVastaanottajat!");
    }

    nahtavillaoloVaiheJulkaisu.tila = KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA;
    nahtavillaoloVaiheJulkaisu.muokkaaja = muokkaaja.uid;

    nahtavillaoloVaiheJulkaisu.nahtavillaoloPDFt = await this.generatePDFs(projekti, nahtavillaoloVaiheJulkaisu);

    await projektiDatabase.nahtavillaoloVaiheJulkaisut.insert(projekti.oid, nahtavillaoloVaiheJulkaisu);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findNahtavillaoloWaitingForApproval(projekti);
    if (!julkaisuWaitingForApproval) {
      throw new Error("Ei nähtävilläolovaihetta odottamassa hyväksyntää");
    }

    const nahtavillaoloVaihe = this.getVaihe(projekti);
    nahtavillaoloVaihe.palautusSyy = syy;
    if (!julkaisuWaitingForApproval.nahtavillaoloPDFt) {
      throw new Error("julkaisuWaitingForApproval.nahtavillaoloPDFt puuttuu");
    }
    await this.deletePDFs(projekti.oid, julkaisuWaitingForApproval.nahtavillaoloPDFt);

    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, nahtavillaoloVaihe });
    await projektiDatabase.nahtavillaoloVaiheJulkaisut.delete(projekti, julkaisuWaitingForApproval.id);
  }

  private async generatePDFs(
    projekti: DBProjekti,
    julkaisuWaitingForApproval: NahtavillaoloVaiheJulkaisu
  ): Promise<LocalizedMap<NahtavillaoloPDF>> {
    const kielitiedot = julkaisuWaitingForApproval.kielitiedot;

    async function generatePDFsForLanguage(kieli: Kieli, julkaisu: NahtavillaoloVaiheJulkaisu): Promise<NahtavillaoloPDF> {
      // Create PDFs in parallel
      const nahtavillaoloPDFPath = createNahtavillaoloVaihePDF(AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS, julkaisu, projekti, kieli);
      const nahtavillaoloIlmoitusPDFPath = createNahtavillaoloVaihePDF(
        AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE,
        julkaisu,
        projekti,
        kieli
      );
      const nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath = createNahtavillaoloVaihePDF(
        AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
        julkaisu,
        projekti,
        kieli
      );
      return {
        nahtavillaoloPDFPath: await nahtavillaoloPDFPath,
        nahtavillaoloIlmoitusPDFPath: await nahtavillaoloIlmoitusPDFPath,
        nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath: await nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath,
      };
    }

    const pdfs: LocalizedMap<NahtavillaoloPDF> = {};
    // Generate PDFs in parallel
    const nahtavillaoloPDFs = generatePDFsForLanguage(kielitiedot.ensisijainenKieli, julkaisuWaitingForApproval);
    if (kielitiedot.toissijainenKieli) {
      pdfs[kielitiedot.toissijainenKieli] = await generatePDFsForLanguage(kielitiedot.toissijainenKieli, julkaisuWaitingForApproval);
    }
    pdfs[kielitiedot.ensisijainenKieli] = await nahtavillaoloPDFs;
    return pdfs;
  }

  private async deletePDFs(oid: string, nahtavillaoloPDFt: LocalizedMap<NahtavillaoloPDF>) {
    for (const language in nahtavillaoloPDFt) {
      // nahtavillaoloPDFt ei ole null, ja language on tyyppiä Kieli, joka on nahtavillaoloPDFt:n avain
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const pdfs: NahtavillaoloPDF = nahtavillaoloPDFt[language];
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: pdfs.nahtavillaoloPDFPath,
        reason: "Nähtävilläolo rejected",
      });
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: pdfs.nahtavillaoloIlmoitusPDFPath,
        reason: "Nähtävilläolo rejected",
      });
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: pdfs.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath,
        reason: "Nähtävilläolo rejected",
      });
    }
  }
}

export const nahtavillaoloTilaManager = new NahtavillaoloTilaManager();
