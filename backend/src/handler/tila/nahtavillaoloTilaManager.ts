import { AsiakirjaTyyppi, Kieli, KuulutusJulkaisuTila, NykyinenKayttaja, TilasiirtymaTyyppi, Vaihe } from "hassu-common/graphql/apiModel";
import { KuulutusTilaManager } from "./KuulutusTilaManager";
import {
  DBProjekti,
  LocalizedMap,
  NahtavillaoloPDF,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  SaameKieli,
  TiedotettavaKuulutusSaamePDFt,
} from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { fileService } from "../../files/fileService";
import { parseDate } from "../../util/dateUtil";
import { SisainenProjektiPaths, PathTuple, ProjektiPaths } from "../../files/ProjektiPath";
import { IllegalAineistoStateError, IllegalArgumentError } from "hassu-common/error";
import assert from "assert";
import { pdfGeneratorClient } from "../../asiakirja/lambda/pdfGeneratorClient";
import { NahtavillaoloKuulutusAsiakirjaTyyppi } from "../../asiakirja/asiakirjaTypes";
import { projektiAdapter } from "../../projekti/adapter/projektiAdapter";
import { assertIsDefined } from "../../util/assertions";
import { ProjektiTiedostoManager, VaiheTiedostoManager } from "../../tiedostot/ProjektiTiedostoManager";
import { requireAdmin, requireOmistaja, requirePermissionMuokkaa } from "../../user/userService";
import { sendNahtavillaKuulutusApprovalMailsAndAttachments } from "../email/emailHandler";
import { isKieliSaame, isKieliTranslatable, KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { isOkToSendNahtavillaoloToApproval } from "../../util/validation";
import { isAllowedToMoveBack } from "hassu-common/util/operationValidators";
import { findNahtavillaoloWaitingForApproval } from "../../projekti/projektiUtil";
import { approvalEmailSender } from "../email/approvalEmailSender";
import { eventSqsClient } from "../../sqsEvents/eventSqsClient";
import { getLinkkiAsianhallintaan } from "../../asianhallinta/getLinkkiAsianhallintaan";
import { isProjektiAsianhallintaIntegrationEnabled } from "../../util/isProjektiAsianhallintaIntegrationEnabled";
import { tallennaMaanomistajaluettelo } from "../../mml/tiedotettavatExcel";
import { parameters } from "../../aws/parameters";
import { log } from "../../logger";
import { forEverySaameDo } from "../../projekti/adapter/common";

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
    suunnitteluSopimus: projekti.suunnitteluSopimus ?? undefined,
    kayttoOikeudet: projekti.kayttoOikeudet,
    nahtavillaoloVaihe: julkaisu,
    kieli,
    luonnos: false,
    euRahoitusLogot: projekti.euRahoitusLogot,
    vahainenMenettely: projekti.vahainenMenettely,
    asianhallintaPaalla: await isProjektiAsianhallintaIntegrationEnabled(projekti),
    linkkiAsianhallintaan: await getLinkkiAsianhallintaan(projekti),
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
    kieli,
  });
}

async function cleanupKuulutusBeforeApproval(projekti: DBProjekti, nahtavillaoloVaihe: NahtavillaoloVaihe) {
  if (nahtavillaoloVaihe.palautusSyy) {
    nahtavillaoloVaihe.palautusSyy = null;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, nahtavillaoloVaihe });
  }
}

class NahtavillaoloTilaManager extends KuulutusTilaManager<NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu> {
  returnKuulutusWithoutSaamePDFs(kuulutus: NahtavillaoloVaihe): NahtavillaoloVaihe {
    const { nahtavillaoloSaamePDFt: _leaveOut, ...rest } = kuulutus;
    return rest;
  }
  constructor() {
    super(Vaihe.NAHTAVILLAOLO);
  }

  async rejectAndPeruAineistoMuokkaus(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisuWaitingForApproval = findNahtavillaoloWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval?.aineistoMuokkaus) {
      projekti = await this.rejectJulkaisu(projekti, julkaisuWaitingForApproval, syy);
    }
    await this.peruAineistoMuokkaus(projekti);
  }

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
    return findNahtavillaoloWaitingForApproval(projekti);
  }

  getUpdatedAineistotForVaihe(
    nahtavillaoloVaihe: NahtavillaoloVaihe,
    id: number,
    paths: ProjektiPaths
  ): Pick<NahtavillaoloVaihe, "aineistoNahtavilla" | "nahtavillaoloSaamePDFt"> {
    const oldPathPrefix = paths.nahtavillaoloVaihe(nahtavillaoloVaihe).yllapitoPath;

    const newPathPrefix = paths.nahtavillaoloVaihe({ ...nahtavillaoloVaihe, id }).yllapitoPath;

    const paivitetytAineistoNahtavilla = this.updateAineistoArrayForUudelleenkuulutus(
      nahtavillaoloVaihe.aineistoNahtavilla,
      oldPathPrefix,
      newPathPrefix
    );

    const nahtavillaoloSaamePDFt = this.updateKuulutusSaamePDFtForUudelleenkuulutus(
      nahtavillaoloVaihe.nahtavillaoloSaamePDFt,
      oldPathPrefix,
      newPathPrefix
    );

    return { aineistoNahtavilla: paivitetytAineistoNahtavilla, nahtavillaoloSaamePDFt };
  }

  async validateSendForApproval(projekti: DBProjekti): Promise<void> {
    const vaihe = this.getVaihe(projekti);
    validateSaamePDFsExistIfRequired(projekti.kielitiedot?.toissijainenKieli, vaihe);
    validateVuorovaikutusKierrosEiOleJulkaisematta(projekti);
    if (!this.getVaiheAineisto(projekti).isReady()) {
      throw new IllegalAineistoStateError();
    }
    const suomifiViestitEnabled = await parameters.isSuomiFiViestitIntegrationEnabled();
    if (suomifiViestitEnabled && !projekti.omistajahaku?.status) {
      const msg = "Kiinteistönomistajia ei ole haettu ennen nähtävilläolon hyväksyntää";
      log.error(msg);
      throw new Error(msg);
    }
  }

  async approve(projekti: DBProjekti, hyvaksyja: NykyinenKayttaja): Promise<void> {
    await super.approve(projekti, hyvaksyja);
    //Lausuntopyyntojen aineistoissa on aina viimeisimmän hyväksytyn nähtävilläolon aineistot.
    await eventSqsClient.zipLausuntoPyyntoAineisto(projekti.oid);
  }

  getVaihe(projekti: DBProjekti): NahtavillaoloVaihe {
    const vaihe = projekti.nahtavillaoloVaihe;
    assertIsDefined(vaihe, "Projektilla ei ole nahtavillaoloVaihetta");
    return vaihe;
  }

  getVaiheAineisto(projekti: DBProjekti): VaiheTiedostoManager<NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu> {
    return new ProjektiTiedostoManager(projekti).getNahtavillaoloVaihe();
  }

  getJulkaisut(projekti: DBProjekti): NahtavillaoloVaiheJulkaisu[] | undefined {
    return projekti.nahtavillaoloVaiheJulkaisut ?? undefined;
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
    const apiProjekti = await projektiAdapter.adaptProjekti(projekti, undefined, false);
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

  protected updateKuulutusSaamePDFtForUudelleenkuulutus(
    saamePDFt: TiedotettavaKuulutusSaamePDFt | undefined,
    oldPathPrefix: string,
    newPathPrefix: string
  ): TiedotettavaKuulutusSaamePDFt | null | undefined {
    if (saamePDFt) {
      forEverySaameDo((kieli) => {
        let pdf = saamePDFt[kieli]?.kuulutusIlmoitusPDF;
        if (pdf) {
          pdf.tiedosto = pdf.tiedosto.replace(oldPathPrefix, newPathPrefix);
        }
        pdf = saamePDFt[kieli]?.kuulutusPDF;
        if (pdf) {
          pdf.tiedosto = pdf.tiedosto.replace(oldPathPrefix, newPathPrefix);
        }
        pdf = saamePDFt[kieli]?.kirjeTiedotettavillePDF;
        if (pdf) {
          pdf.tiedosto = pdf.tiedosto.replace(oldPathPrefix, newPathPrefix);
        }
      });
      return saamePDFt;
    }
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
    assertIsDefined(projekti.vuorovaikutusKierros);
    await projektiDatabase.saveProjektiWithoutLocking({
      oid: projekti.oid,
      nahtavillaoloVaihe: null,
      vuorovaikutusKierros: { ...projekti.vuorovaikutusKierros, palattuNahtavillaolosta: true },
    });
    await projektiDatabase.nahtavillaoloVaiheJulkaisut.deleteAll(projekti);
    await fileService.deleteProjektiFilesRecursively(new ProjektiPaths(projekti.oid), ProjektiPaths.PATH_NAHTAVILLAOLO);
  }

  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja, tilasiirtymaTyyppi: TilasiirtymaTyyppi): Promise<void> {
    const julkaisuWaitingForApproval = findNahtavillaoloWaitingForApproval(projekti);
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
    if (
      !nahtavillaoloVaiheJulkaisu.uudelleenKuulutus ||
      nahtavillaoloVaiheJulkaisu.uudelleenKuulutus.tiedotaKiinteistonomistajia === undefined ||
      nahtavillaoloVaiheJulkaisu.uudelleenKuulutus.tiedotaKiinteistonomistajia
    ) {
      nahtavillaoloVaiheJulkaisu.maanomistajaluettelo = await tallennaMaanomistajaluettelo(
        projekti,
        new SisainenProjektiPaths(projekti.oid).nahtavillaoloVaihe(nahtavillaoloVaiheJulkaisu),
        this.vaihe,
        nahtavillaoloVaiheJulkaisu.kuulutusPaiva,
        nahtavillaoloVaiheJulkaisu.id
      );
    }
    await projektiDatabase.nahtavillaoloVaiheJulkaisut.insert(projekti.oid, nahtavillaoloVaiheJulkaisu);
    const updatedProjekti = await projektiDatabase.loadProjektiByOid(projekti.oid);
    if (!updatedProjekti) {
      throw new Error("Projektia oid:lla ${projekti.oid)} ei löydy");
    }
    await approvalEmailSender.sendEmails(updatedProjekti, tilasiirtymaTyyppi);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisuWaitingForApproval = findNahtavillaoloWaitingForApproval(projekti);
    if (!julkaisuWaitingForApproval) {
      throw new Error("Ei nähtävilläolovaihetta odottamassa hyväksyntää");
    }
    projekti = await this.rejectJulkaisu(projekti, julkaisuWaitingForApproval, syy);
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, nahtavillaoloVaihe: projekti.nahtavillaoloVaihe });
  }

  private async rejectJulkaisu(projekti: DBProjekti, julkaisu: NahtavillaoloVaiheJulkaisu, syy: string): Promise<DBProjekti> {
    const nahtavillaoloVaihe = this.getVaihe(projekti);
    nahtavillaoloVaihe.palautusSyy = syy;
    if (!julkaisu.nahtavillaoloPDFt) {
      throw new Error("julkaisuWaitingForApproval.nahtavillaoloPDFt puuttuu");
    }
    await this.deletePDFs(projekti.oid, julkaisu.nahtavillaoloPDFt);
    if (julkaisu.maanomistajaluettelo) {
      await fileService.deleteYllapitoSisainenFileFromProjekti({
        oid: projekti.oid,
        filePathInProjekti: julkaisu.maanomistajaluettelo,
        reason: "Nähtävilläolo rejected",
      });
    }
    await projektiDatabase.nahtavillaoloVaiheJulkaisut.delete(projekti, julkaisu.id);
    return {
      ...projekti,
      nahtavillaoloVaihe,
      nahtavillaoloVaiheJulkaisut: projekti.nahtavillaoloVaiheJulkaisut?.filter((j) => julkaisu.id != j.id),
    };
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
    const nahtavillaoloPDFs = generatePDFsForLanguage(kielitiedot.ensisijainenKieli, julkaisuWaitingForApproval);
    if (isKieliTranslatable(kielitiedot.toissijainenKieli)) {
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

function validateSaamePDFsExistIfRequired(toissijainenKieli: Kieli | undefined | null, vaihe: NahtavillaoloVaihe) {
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
