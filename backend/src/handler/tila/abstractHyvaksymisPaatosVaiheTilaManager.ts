import { TilaManager } from "./TilaManager";
import {
  DBProjekti,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  HyvaksymisPaatosVaihePDF,
  LocalizedMap,
} from "../../database/model";
import { parseAndAddDateTime, parseDate } from "../../util/dateUtil";
import { HYVAKSYMISPAATOS_DURATION, JATKOPAATOS_DURATION } from "../../projekti/status/statusHandler";
import { AsiakirjaTyyppi, Kieli } from "../../../../common/graphql/apiModel";
import { fileService } from "../../files/fileService";
import { PathTuple } from "../../files/ProjektiPath";
import { projektiDatabase } from "../../database/projektiDatabase";
import assert from "assert";
import { HyvaksymisPaatosKuulutusAsiakirjaTyyppi } from "../../asiakirja/asiakirjaTypes";
import { pdfGeneratorClient } from "../../asiakirja/lambda/pdfGeneratorClient";

export abstract class AbstractHyvaksymisPaatosVaiheTilaManager extends TilaManager {
  async removeRejectionReasonIfExists(
    projekti: DBProjekti,
    key: "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe" | "hyvaksymisPaatosVaihe",
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe
  ): Promise<void> {
    if (hyvaksymisPaatosVaihe.palautusSyy) {
      hyvaksymisPaatosVaihe.palautusSyy = null;
      await projektiDatabase.saveProjekti({ oid: projekti.oid, [key]: hyvaksymisPaatosVaihe });
    }
  }

  getNextAjastettuTarkistus(julkaisu: HyvaksymisPaatosVaiheJulkaisu, isHyvaksymisPaatos: boolean): string | undefined {
    if (!julkaisu.kuulutusVaihePaattyyPaiva) {
      throw new Error("julkaisulta.kuulutusVaihePaattyyPaiva puuttuu");
    }
    const paatosDuration = isHyvaksymisPaatos ? HYVAKSYMISPAATOS_DURATION : JATKOPAATOS_DURATION;

    return parseAndAddDateTime(julkaisu.kuulutusVaihePaattyyPaiva, "end-of-day", paatosDuration)?.format();
  }

  protected async generatePDFs(
    projekti: DBProjekti,
    julkaisuWaitingForApproval: HyvaksymisPaatosVaiheJulkaisu,
    path: PathTuple
  ): Promise<LocalizedMap<HyvaksymisPaatosVaihePDF>> {
    const kielitiedot = julkaisuWaitingForApproval.kielitiedot;

    async function generatePDFsForLanguage(kieli: Kieli, julkaisu: HyvaksymisPaatosVaiheJulkaisu): Promise<HyvaksymisPaatosVaihePDF> {
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
      const ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath = createPDFOfType(
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNILLE
      );
      const ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath = createPDFOfType(
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE
      );
      return {
        hyvaksymisKuulutusPDFPath: await hyvaksymisKuulutusPDFPath,
        hyvaksymisIlmoitusLausunnonantajillePDFPath: await hyvaksymisIlmoitusLausunnonantajillePDFPath,
        hyvaksymisIlmoitusMuistuttajillePDFPath: await hyvaksymisIlmoitusMuistuttajillePDFPath,
        ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath: await ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath,
        ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath:
          await ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath,
      };
    }

    const pdfs: LocalizedMap<HyvaksymisPaatosVaihePDF> = {};
    // Generate PDFs in parallel
    const hyvaksymisPaatosVaihePDFs = generatePDFsForLanguage(kielitiedot.ensisijainenKieli, julkaisuWaitingForApproval);
    if (kielitiedot.toissijainenKieli) {
      pdfs[kielitiedot.toissijainenKieli] = await generatePDFsForLanguage(kielitiedot.toissijainenKieli, julkaisuWaitingForApproval);
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
        pdfs.ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath,
        pdfs.ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath,
      ]) {
        await fileService.deleteYllapitoFileFromProjekti({
          oid,
          filePathInProjekti: path,
        });
      }
    }
  }

  protected abstract getHyvaksymisPaatosVaihe(projekti: DBProjekti): HyvaksymisPaatosVaihe;

  async uudelleenkuuluta(_projekti: DBProjekti): Promise<void> {
    throw new Error("Not yet implemented");
  }
}

async function createPDF(
  asiakirjaTyyppi: HyvaksymisPaatosKuulutusAsiakirjaTyyppi,
  julkaisu: HyvaksymisPaatosVaiheJulkaisu,
  projekti: DBProjekti,
  kieli: Kieli,
  path: PathTuple
) {
  assert(julkaisu.kuulutusPaiva, "julkaisulta puuttuu kuulutuspäivä");
  assert(projekti.kasittelynTila, "kasittelynTila puuttuu");
  const pdf = await pdfGeneratorClient.createHyvaksymisPaatosKuulutusPdf({
    asiakirjaTyyppi,
    oid: projekti.oid,
    kayttoOikeudet: projekti.kayttoOikeudet,
    hyvaksymisPaatosVaihe: julkaisu,
    kasittelynTila: projekti.kasittelynTila,
    kieli,
    luonnos: false,
    suunnitteluSopimus: projekti.suunnitteluSopimus || undefined,
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
