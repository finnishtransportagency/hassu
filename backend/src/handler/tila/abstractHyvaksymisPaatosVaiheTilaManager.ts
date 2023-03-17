import { KuulutusTilaManager } from "./KuulutusTilaManager";
import {
  DBProjekti,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  HyvaksymisPaatosVaihePDF,
  LocalizedMap,
} from "../../database/model";
import { parseDate } from "../../util/dateUtil";
import { AsiakirjaTyyppi } from "../../../../common/graphql/apiModel";
import { fileService } from "../../files/fileService";
import { PathTuple } from "../../files/ProjektiPath";
import { projektiDatabase } from "../../database/projektiDatabase";
import assert from "assert";
import { HyvaksymisPaatosKuulutusAsiakirjaTyyppi } from "../../asiakirja/asiakirjaTypes";
import { pdfGeneratorClient } from "../../asiakirja/lambda/pdfGeneratorClient";
import { isKieliTranslatable, KaannettavaKieli } from "../../../../common/kaannettavatKielet";

export abstract class AbstractHyvaksymisPaatosVaiheTilaManager extends KuulutusTilaManager<
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu
> {
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
    path: PathTuple
  ): Promise<LocalizedMap<HyvaksymisPaatosVaihePDF>> {
    const kielitiedot = julkaisuWaitingForApproval.kielitiedot;

    async function generatePDFsForLanguage(
      kieli: KaannettavaKieli,
      julkaisu: HyvaksymisPaatosVaiheJulkaisu
    ): Promise<HyvaksymisPaatosVaihePDF> {
      async function createPDFOfType(type: HyvaksymisPaatosKuulutusAsiakirjaTyyppi) {
        return createPDF(type, julkaisu, projekti, kieli, path);
      }

      // Create PDFs in parallel
      const hyvaksymisKuulutusPDFPath = createPDFOfType(AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS);
      const hyvaksymisIlmoitusLausunnonantajillePDFPath = createPDFOfType(
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE
      );
      const hyvaksymisIlmoitusMuistuttajillePDFPath = createPDFOfType(
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
      );
      const ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath = createPDFOfType(
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE
      );
      const ilmoitusHyvaksymispaatoskuulutuksestaPDFPath = createPDFOfType(AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA);
      return {
        hyvaksymisKuulutusPDFPath: await hyvaksymisKuulutusPDFPath,
        hyvaksymisIlmoitusLausunnonantajillePDFPath: await hyvaksymisIlmoitusLausunnonantajillePDFPath,
        hyvaksymisIlmoitusMuistuttajillePDFPath: await hyvaksymisIlmoitusMuistuttajillePDFPath,
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
    const hyvaksymisPaatosVaihePDFs = generatePDFsForLanguage(
      kielitiedot.ensisijainenKieli as KaannettavaKieli,
      julkaisuWaitingForApproval
    );
    if (isKieliTranslatable(kielitiedot.toissijainenKieli)) {
      pdfs[kielitiedot.toissijainenKieli as KaannettavaKieli] = await generatePDFsForLanguage(
        kielitiedot.toissijainenKieli as KaannettavaKieli,
        julkaisuWaitingForApproval
      );
    }
    pdfs[kielitiedot.ensisijainenKieli] = await hyvaksymisPaatosVaihePDFs;
    return pdfs;
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
        await fileService.deleteYllapitoFileFromProjekti({
          oid,
          filePathInProjekti: path,
          reason: "Hyväksymispäätösvaihe rejected",
        });
      }
    }
  }
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
  });
  return fileService.createFileToProjekti({
    oid: projekti.oid,
    path,
    fileName: pdf.nimi,
    contents: Buffer.from(pdf.sisalto, "base64"),
    inline: true,
    contentType: "application/pdf",
    publicationTimestamp: parseDate(julkaisu.kuulutusPaiva),
  });
}
