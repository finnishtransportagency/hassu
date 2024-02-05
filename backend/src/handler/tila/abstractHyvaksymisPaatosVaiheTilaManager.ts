import { KuulutusTilaManager } from "./KuulutusTilaManager";
import {
  DBProjekti,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  HyvaksymisPaatosVaihePDF,
  KuulutusSaamePDFt,
  LocalizedMap,
  SaameKieli,
} from "../../database/model";
import { parseDate } from "../../util/dateUtil";
import { Kieli } from "hassu-common/graphql/apiModel";
import { fileService } from "../../files/fileService";
import { PathTuple } from "../../files/ProjektiPath";
import { projektiDatabase } from "../../database/projektiDatabase";
import assert from "assert";
import { pdfGeneratorClient } from "../../asiakirja/lambda/pdfGeneratorClient";
import { isKieliSaame, isKieliTranslatable, KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { assertIsDefined } from "../../util/assertions";
import { IllegalArgumentError } from "hassu-common/error";
import { findHyvaksymisPaatosVaiheWaitingForApproval } from "../../projekti/projektiUtil";
import { HyvaksymisPaatosKuulutusAsiakirjaTyyppi, paatosSpecificRoutesMap, PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { isProjektiAsianhallintaIntegrationEnabled } from "../../util/isProjektiAsianhallintaIntegrationEnabled";
import { getLinkkiAsianhallintaan } from "../../asianhallinta/getLinkkiAsianhallintaan";

export abstract class AbstractHyvaksymisPaatosVaiheTilaManager extends KuulutusTilaManager<
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu
> {
  returnKuulutusWithoutSaamePDFs(kuulutus: HyvaksymisPaatosVaihe): HyvaksymisPaatosVaihe {
    const { hyvaksymisPaatosVaiheSaamePDFt: _leaveOut, ...rest } = kuulutus;
    return rest;
  }

  async rejectAndPeruAineistoMuokkaus(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisuWaitingForApproval = findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval && julkaisuWaitingForApproval.aineistoMuokkaus) {
      projekti = await this.rejectJulkaisu(projekti, julkaisuWaitingForApproval, syy);
    }
    await this.peruAineistoMuokkaus(projekti);
  }

  async removeRejectionReasonIfExists(
    projekti: DBProjekti,
    key: "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe" | "hyvaksymisPaatosVaihe",
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe
  ): Promise<void> {
    if (hyvaksymisPaatosVaihe.palautusSyy) {
      hyvaksymisPaatosVaihe.palautusSyy = null;
      await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, [key]: hyvaksymisPaatosVaihe });
    }
  }

  protected async generatePDFs(
    projekti: DBProjekti,
    julkaisuWaitingForApproval: HyvaksymisPaatosVaiheJulkaisu,
    path: PathTuple,
    paatosTyyppi: PaatosTyyppi
  ): Promise<LocalizedMap<HyvaksymisPaatosVaihePDF>> {
    const kielitiedot = julkaisuWaitingForApproval.kielitiedot;

    async function generatePDFsForLanguage(
      kieli: KaannettavaKieli,
      julkaisu: HyvaksymisPaatosVaiheJulkaisu
    ): Promise<HyvaksymisPaatosVaihePDF> {
      async function createPDFOfType(type: HyvaksymisPaatosKuulutusAsiakirjaTyyppi) {
        return createPDF(type, julkaisu, projekti, kieli, path);
      }

      const {
        ilmoitusPaatoskuulutuksestaLausunnonantajilleAsiakirjaTyyppi,
        ilmoitusPaatoskuulutuksestaMuistuttajilleAsiakirjaTyyppi,
        paatosAsiakirjaTyyppi,
        ilmoitusPaatoskuulutuksestaAsiakirjaTyyppi,
        ilmoitusPaatoskuulutuksestaKunnalleJaToiselleViranomaiselleAsiakirjaTyyppi,
      } = paatosSpecificRoutesMap[paatosTyyppi];

      // Create PDFs in parallel
      const hyvaksymisKuulutusPDFPath = createPDFOfType(paatosAsiakirjaTyyppi);
      const hyvaksymisIlmoitusLausunnonantajillePDFPath = createPDFOfType(ilmoitusPaatoskuulutuksestaLausunnonantajilleAsiakirjaTyyppi);
      const hyvaksymisIlmoitusMuistuttajillePDFPath = ilmoitusPaatoskuulutuksestaMuistuttajilleAsiakirjaTyyppi
        ? createPDFOfType(ilmoitusPaatoskuulutuksestaMuistuttajilleAsiakirjaTyyppi)
        : undefined;
      const ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath = createPDFOfType(
        ilmoitusPaatoskuulutuksestaKunnalleJaToiselleViranomaiselleAsiakirjaTyyppi
      );
      const ilmoitusHyvaksymispaatoskuulutuksestaPDFPath = createPDFOfType(ilmoitusPaatoskuulutuksestaAsiakirjaTyyppi);
      return {
        hyvaksymisKuulutusPDFPath: await hyvaksymisKuulutusPDFPath,
        hyvaksymisIlmoitusLausunnonantajillePDFPath: await hyvaksymisIlmoitusLausunnonantajillePDFPath,
        hyvaksymisIlmoitusMuistuttajillePDFPath: hyvaksymisIlmoitusMuistuttajillePDFPath
          ? await hyvaksymisIlmoitusMuistuttajillePDFPath
          : undefined,
        ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath:
          await ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath,
        ilmoitusHyvaksymispaatoskuulutuksestaPDFPath: await ilmoitusHyvaksymispaatoskuulutuksestaPDFPath,
      };
    }

    const pdfs: LocalizedMap<HyvaksymisPaatosVaihePDF> = {};
    // Generate PDFs in parallel
    assert(
      isKieliTranslatable(kielitiedot.ensisijainenKieli),
      "ensisijaisen kielen on oltava käännettävä kieli, esim. saame ei ole sallittu"
    );
    const hyvaksymisPaatosVaihePDFs = generatePDFsForLanguage(kielitiedot.ensisijainenKieli, julkaisuWaitingForApproval);
    if (isKieliTranslatable(kielitiedot.toissijainenKieli)) {
      pdfs[kielitiedot.toissijainenKieli] = await generatePDFsForLanguage(kielitiedot.toissijainenKieli, julkaisuWaitingForApproval);
    }
    pdfs[kielitiedot.ensisijainenKieli] = await hyvaksymisPaatosVaihePDFs;
    return pdfs;
  }

  async palaa(_projekti: DBProjekti): Promise<void> {
    throw new IllegalArgumentError("Hyväksymisvaiheille ei ole toteutettu palaamistoimintoa!");
  }

  protected async deletePDFs(oid: string, pdft: LocalizedMap<HyvaksymisPaatosVaihePDF>): Promise<void> {
    for (const language in pdft) {
      // pdft ei ole null, ja language on tyyppiä Kieli, joka on pft:n avain
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const pdfs: HyvaksymisPaatosVaihePDF = pdft[language];
      for (const path of [
        pdfs.hyvaksymisKuulutusPDFPath,
        pdfs.hyvaksymisIlmoitusLausunnonantajillePDFPath,
        pdfs.hyvaksymisIlmoitusMuistuttajillePDFPath,
        pdfs.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath,
        pdfs.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath,
      ]) {
        if (path) {
          await fileService.deleteYllapitoFileFromProjekti({
            oid,
            filePathInProjekti: path,
            reason: "Hyväksymispäätösvaihe rejected",
          });
        }
      }
    }
  }

  getUpdatedVaiheTiedotForPeruAineistoMuokkaus(viimeisinJulkaisu: HyvaksymisPaatosVaiheJulkaisu): HyvaksymisPaatosVaihe {
    const {
      yhteystiedot: _yhteystiedot,
      aineistoMuokkaus: _aineistoMuokkaus,
      uudelleenKuulutus: _uudelleenKuulutus,
      tila: _tila,
      ...rest
    } = viimeisinJulkaisu;
    return { ...rest, uudelleenKuulutus: null, aineistoMuokkaus: null };
  }

  validateSaamePDFsExistIfRequired(
    toissijainenKieli: Kieli | undefined,
    hyvaksymisPaatosVaiheSaamePDFt: KuulutusSaamePDFt | undefined | null
  ): void {
    if (isKieliSaame(toissijainenKieli)) {
      assertIsDefined(toissijainenKieli);
      const saamePDFt = hyvaksymisPaatosVaiheSaamePDFt?.[toissijainenKieli as unknown as SaameKieli];
      if (saamePDFt) {
        if (!saamePDFt.kuulutusIlmoitusPDF || !saamePDFt.kuulutusPDF) {
          throw new IllegalArgumentError("Saamenkieliset PDFt puuttuvat");
        }
      }
    }
  }

  abstract rejectJulkaisu(projekti: DBProjekti, julkaisu: HyvaksymisPaatosVaiheJulkaisu, syy: string): Promise<DBProjekti>;
}

async function createPDF(
  asiakirjaTyyppi: HyvaksymisPaatosKuulutusAsiakirjaTyyppi,
  julkaisu: HyvaksymisPaatosVaiheJulkaisu,
  projekti: DBProjekti,
  kieli: KaannettavaKieli,
  path: PathTuple
) {
  assert(julkaisu.kuulutusPaiva, "julkaisulta puuttuu kuulutuspäivä");
  assert(projekti.kasittelynTila, "kasittelynTila puuttuu");
  const pdf = await pdfGeneratorClient.createHyvaksymisPaatosKuulutusPdf({
    asiakirjaTyyppi,
    oid: projekti.oid,
    lyhytOsoite: projekti.lyhytOsoite,
    kayttoOikeudet: projekti.kayttoOikeudet,
    hyvaksymisPaatosVaihe: julkaisu,
    kasittelynTila: projekti.kasittelynTila,
    kieli,
    luonnos: false,
    euRahoitusLogot: projekti.euRahoitusLogot,
    asianhallintaPaalla: await isProjektiAsianhallintaIntegrationEnabled(projekti),
    linkkiAsianhallintaan: await getLinkkiAsianhallintaan(projekti),
  });
  return fileService.createFileToProjekti({
    oid: projekti.oid,
    path,
    fileName: pdf.nimi,
    contents: Buffer.from(pdf.sisalto, "base64"),
    inline: true,
    contentType: "application/pdf",
    publicationTimestamp: parseDate(julkaisu.kuulutusPaiva),
    asiakirjaTyyppi,
    kieli,
  });
}
