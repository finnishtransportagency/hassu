import { TilaManager } from "./TilaManager";
import {
  DBProjekti,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  HyvaksymisPaatosVaihePDF,
  LocalizedMap,
} from "../../database/model";
import { parseAndAddDate, parseDate } from "../../util/dateUtil";
import {
  HYVAKSYMISPAATOS_DURATION_UNIT,
  HYVAKSYMISPAATOS_DURATION_VALUE,
  JATKOPAATOS_DURATION_UNIT,
  JATKOPAATOS_DURATION_VALUE,
} from "../../projekti/status/statusHandler";
import { AsiakirjaTyyppi, Kieli } from "../../../../common/graphql/apiModel";
import { fileService } from "../../files/fileService";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { projektiDatabase } from "../../database/projektiDatabase";
import assert from "assert";
import { HyvaksymisPaatosKuulutusAsiakirjaTyyppi } from "../../asiakirja/asiakirjaTypes";
import { pdfGeneratorClient } from "../../asiakirja/lambda/pdfGeneratorClient";

export abstract class AbstractHyvaksymisPaatosVaiheTilaManager extends TilaManager {
  async removeRejectionReasonIfExists(projekti: DBProjekti, jatkoPaatos1Vaihe: HyvaksymisPaatosVaihe): Promise<void> {
    if (jatkoPaatos1Vaihe.palautusSyy) {
      jatkoPaatos1Vaihe.palautusSyy = null;
      await projektiDatabase.saveProjekti({ oid: projekti.oid, jatkoPaatos1Vaihe });
    }
  }

  getNextAjastettuTarkistus(julkaisu: HyvaksymisPaatosVaiheJulkaisu, isHyvaksymisPaatos: boolean): string | undefined {
    if (!julkaisu.kuulutusVaihePaattyyPaiva) {
      throw new Error("julkaisulta.kuulutusVaihePaattyyPaiva puuttuu");
    }
    if (isHyvaksymisPaatos) {
      return parseAndAddDate(julkaisu.kuulutusVaihePaattyyPaiva, HYVAKSYMISPAATOS_DURATION_VALUE, HYVAKSYMISPAATOS_DURATION_UNIT)?.format();
    }
    return parseAndAddDate(julkaisu.kuulutusVaihePaattyyPaiva, JATKOPAATOS_DURATION_VALUE, JATKOPAATOS_DURATION_UNIT)?.format();
  }

  protected async generatePDFs(
    projekti: DBProjekti,
    julkaisuWaitingForApproval: HyvaksymisPaatosVaiheJulkaisu
  ): Promise<LocalizedMap<HyvaksymisPaatosVaihePDF>> {
    const kielitiedot = julkaisuWaitingForApproval.kielitiedot;

    async function generatePDFsForLanguage(kieli: Kieli, julkaisu: HyvaksymisPaatosVaiheJulkaisu): Promise<HyvaksymisPaatosVaihePDF> {
      async function createPDFOfType(type: HyvaksymisPaatosKuulutusAsiakirjaTyyppi) {
        return createPDF(type, julkaisu, projekti, kieli);
      }

      return {
        hyvaksymisKuulutusPDFPath: await createPDFOfType(AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS),
        hyvaksymisIlmoitusLausunnonantajillePDFPath: await createPDFOfType(
          AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE
        ),
        hyvaksymisIlmoitusMuistuttajillePDFPath: await createPDFOfType(
          AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
        ),
        ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath: await createPDFOfType(
          AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNILLE
        ),
        ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath: await createPDFOfType(
          AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE
        ),
      };
    }

    const pdfs: LocalizedMap<HyvaksymisPaatosVaihePDF> = {};
    pdfs[kielitiedot.ensisijainenKieli] = await generatePDFsForLanguage(kielitiedot.ensisijainenKieli, julkaisuWaitingForApproval);

    if (kielitiedot.toissijainenKieli) {
      pdfs[kielitiedot.toissijainenKieli] = await generatePDFsForLanguage(kielitiedot.toissijainenKieli, julkaisuWaitingForApproval);
    }
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
}

async function createPDF(
  asiakirjaTyyppi: HyvaksymisPaatosKuulutusAsiakirjaTyyppi,
  julkaisu: HyvaksymisPaatosVaiheJulkaisu,
  projekti: DBProjekti,
  kieli: Kieli
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
  });
  return fileService.createFileToProjekti({
    oid: projekti.oid,
    filePathInProjekti: ProjektiPaths.PATH_HYVAKSYMISPAATOS,
    fileName: pdf.nimi,
    contents: Buffer.from(pdf.sisalto, "base64"),
    inline: true,
    contentType: "application/pdf",
    publicationTimestamp: parseDate(julkaisu.kuulutusPaiva),
    copyToPublic: true,
  });
}
