import { AsiakirjaTyyppi, Kieli, KuulutusJulkaisuTila, NykyinenKayttaja, TilasiirtymaTyyppi } from "../../../../common/graphql/apiModel";
import { KuulutusTilaManager } from "./KuulutusTilaManager";
import {
  DBProjekti,
  LocalizedMap,
  NahtavillaoloPDF,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  SaameKieli,
} from "../../database/model";
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
import { ProjektiAineistoManager, VaiheAineisto } from "../../aineisto/projektiAineistoManager";
import { requireAdmin, requireOmistaja, requirePermissionMuokkaa } from "../../user/userService";
import { IllegalAineistoStateError } from "../../error/IllegalAineistoStateError";
import { sendNahtavillaKuulutusApprovalMailsAndAttachments } from "../email/emailHandler";
import { isKieliSaame, isKieliTranslatable, KaannettavaKieli } from "../../../../common/kaannettavatKielet";
import { isOkToSendNahtavillaoloToApproval } from "../../util/validation";
import { isAllowedToMoveBack } from "../../../../common/util/operationValidators";

async function createNahtavillaoloVaihePDF(
  asiakirjaTyyppi: NahtavillaoloKuulutusAsiakirjaTyyppi,
  julkaisu: NahtavillaoloVaiheJulkaisu,
  projekti: DBProjekti,
  kieli: KaannettavaKieli
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
    vahainenMenettely: projekti.vahainenMenettely,
  });
  return fileService.createFileToProjekti({
    oid: projekti.oid,
    path: new ProjektiPaths(projekti.oid).nahtavillaoloVaihe(julkaisu),
    fileName: pdf.nimi,
    contents: Buffer.from(pdf.sisalto, "base64"),
    inline: true,
    contentType: "application/pdf",
    publicationTimestamp: parseDate(julkaisu.kuulutusPaiva),
    asiakirjaTyyppi,
  });
}

async function cleanupKuulutusBeforeApproval(projekti: DBProjekti, nahtavillaoloVaihe: NahtavillaoloVaihe) {
  if (nahtavillaoloVaihe.palautusSyy) {
    nahtavillaoloVaihe.palautusSyy = null;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, nahtavillaoloVaihe });
  }
}

class NahtavillaoloTilaManager extends KuulutusTilaManager<NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu> {
  getVaihePathname(): string {
    return ProjektiPaths.PATH_NAHTAVILLAOLO;
  }
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
  ): Pick<NahtavillaoloVaihe, "aineistoNahtavilla" | "lisaAineisto" | "nahtavillaoloSaamePDFt"> {
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

    const nahtavillaoloSaamePDFt = this.updateKuulutusSaamePDFtForUudelleenkuulutus(
      nahtavillaoloVaihe.nahtavillaoloSaamePDFt,
      oldPathPrefix,
      newPathPrefix
    );

    return { aineistoNahtavilla: paivitetytAineistoNahtavilla, lisaAineisto: paivitetytLisaAineisto, nahtavillaoloSaamePDFt };
  }

  validateSendForApproval(projekti: DBProjekti): void {
    const vaihe = this.getVaihe(projekti);
    validateSaamePDFsExistIfRequired(projekti.kielitiedot?.toissijainenKieli, vaihe);
    validateVuorovaikutusKierrosEiOleJulkaisematta(projekti);
    if (!this.getVaiheAineisto(projekti).isReady()) {
      throw new IllegalAineistoStateError();
    }
  }

  getVaihe(projekti: DBProjekti): NahtavillaoloVaihe {
    const vaihe = projekti.nahtavillaoloVaihe;
    assertIsDefined(vaihe, "Projektilla ei ole nahtavillaoloVaihetta");
    return vaihe;
  }

  getVaiheAineisto(projekti: DBProjekti): VaiheAineisto<NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu> {
    return new ProjektiAineistoManager(projekti).getNahtavillaoloVaihe();
  }

  getJulkaisut(projekti: DBProjekti): NahtavillaoloVaiheJulkaisu[] | undefined {
    return projekti.nahtavillaoloVaiheJulkaisut || undefined;
  }

  async validateUudelleenkuulutus(
    projekti: DBProjekti,
    kuulutus: NahtavillaoloVaihe,
    hyvaksyttyJulkaisu: NahtavillaoloVaiheJulkaisu | undefined
  ): Promise<void> {
    // Tarkista, että on olemassa hyväksytty julkaisu, jonka perua
    if (!hyvaksyttyJulkaisu) {
      throw new IllegalArgumentError("Ei ole olemassa kuulutusta, jota uudelleenkuuluttaa");
    }
    // Nähtävilläolovaiheen uudelleenkuuluttaminen on mahdollista vain jos hyväksymispäätöskuulutusjulkaisua ei ole
    const apiProjekti = await projektiAdapter.adaptProjekti(projekti);
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

  validatePalaa(projekti: DBProjekti) {
    if (!isAllowedToMoveBack(TilasiirtymaTyyppi.NAHTAVILLAOLO, projekti)) {
      throw new IllegalArgumentError("Et voi siirtyä taaksepäin projektin nykytilassa");
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

  getUpdatedVaiheTiedotForPeruAineistoMuokkaus(viimeisinJulkaisu: NahtavillaoloVaiheJulkaisu): NahtavillaoloVaihe {
    const {
      yhteystiedot: _yhteystiedot,
      aineistoMuokkaus: _aineistoMuokkaus,
      uudelleenKuulutus: _uudelleenKuulutus,
      tila: _tila,
      ...rest
    } = viimeisinJulkaisu;
    return { ...rest, uudelleenKuulutus: null, aineistoMuokkaus: null };
  }

  async palaa(projekti: DBProjekti): Promise<void> {
    await projektiDatabase.saveProjektiWithoutLocking({
      oid: projekti.oid,
      nahtavillaoloVaihe: null,
    });
    await projektiDatabase.nahtavillaoloVaiheJulkaisut.deleteAll(projekti);
    await fileService.deleteProjektiFilesRecursively(new ProjektiPaths(projekti.oid), ProjektiPaths.PATH_NAHTAVILLAOLO);
  }

  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findNahtavillaoloWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("Nahtavillaolovaihe on jo olemassa odottamassa hyväksyntää");
    }

    const nahtavillaoloVaihe = this.getVaihe(projekti);

    await cleanupKuulutusBeforeApproval(projekti, nahtavillaoloVaihe);

    const nahtavillaoloVaiheJulkaisu = await asiakirjaAdapter.adaptNahtavillaoloVaiheJulkaisu(projekti);
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

    async function generatePDFsForLanguage(kieli: KaannettavaKieli, julkaisu: NahtavillaoloVaiheJulkaisu): Promise<NahtavillaoloPDF> {
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
    assert(
      isKieliTranslatable(kielitiedot.ensisijainenKieli),
      "ensisijaisen kielen on oltava käännettävä kieli, esim. saame ei ole sallittu"
    );
    const nahtavillaoloPDFs = generatePDFsForLanguage(kielitiedot.ensisijainenKieli as KaannettavaKieli, julkaisuWaitingForApproval);
    if (isKieliTranslatable(kielitiedot.toissijainenKieli)) {
      pdfs[kielitiedot.toissijainenKieli as KaannettavaKieli] = await generatePDFsForLanguage(
        kielitiedot.toissijainenKieli as KaannettavaKieli,
        julkaisuWaitingForApproval
      );
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

function validateSaamePDFsExistIfRequired(toissijainenKieli: Kieli | undefined, vaihe: NahtavillaoloVaihe) {
  if (isKieliSaame(toissijainenKieli)) {
    assertIsDefined(toissijainenKieli);
    const saamePDFt = vaihe?.nahtavillaoloSaamePDFt?.[toissijainenKieli as unknown as SaameKieli];
    if (saamePDFt) {
      if (!saamePDFt.kuulutusIlmoitusPDF || !saamePDFt.kuulutusPDF) {
        throw new IllegalArgumentError("Saamenkieliset PDFt puuttuvat");
      }
    }
  }
}

function validateVuorovaikutusKierrosEiOleJulkaisematta(dbProjekti: DBProjekti): void {
  if (!isOkToSendNahtavillaoloToApproval(dbProjekti)) {
    throw new IllegalArgumentError("Toiminto ei ole sallittu, koska vuorovaikutuskierros on vielä julkaisematta.");
  }
}

export const nahtavillaoloTilaManager = new NahtavillaoloTilaManager();
