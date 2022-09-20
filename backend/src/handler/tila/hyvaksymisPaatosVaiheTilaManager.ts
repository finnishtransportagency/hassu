import { AsiakirjaTyyppi, HyvaksymisPaatosVaiheTila, Kieli, NykyinenKayttaja } from "../../../../common/graphql/apiModel";
import { TilaManager } from "./TilaManager";
import {
  DBProjekti,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  HyvaksymisPaatosVaihePDF,
  LocalizedMap,
} from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { aineistoService } from "../../aineisto/aineistoService";
import { fileService } from "../../files/fileService";
import { asiakirjaService, HyvaksymisPaatosKuulutusAsiakirjaTyyppi } from "../../asiakirja/asiakirjaService";
import { parseAndAddDate, parseDate } from "../../util/dateUtil";
import { ProjektiPaths } from "../../files/ProjektiPath";
import {
  HYVAKSYMISPAATOS_DURATION_UNIT,
  HYVAKSYMISPAATOS_DURATION_VALUE,
  JATKOPAATOS_DURATION_UNIT,
  JATKOPAATOS_DURATION_VALUE,
} from "../../projekti/status/statusHandler";

async function createPDF(
  asiakirjaTyyppi: HyvaksymisPaatosKuulutusAsiakirjaTyyppi,
  julkaisu: HyvaksymisPaatosVaiheJulkaisu,
  projekti: DBProjekti,
  kieli: Kieli
) {
  const pdf = await asiakirjaService.createHyvaksymisPaatosKuulutusPdf({
    asiakirjaTyyppi,
    projekti,
    hyvaksymisPaatosVaihe: julkaisu,
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

function getHyvaksymisPaatosVaihe(projekti: DBProjekti): HyvaksymisPaatosVaihe {
  const hyvaksymisPaatosVaihe = projekti.hyvaksymisPaatosVaihe;
  if (!hyvaksymisPaatosVaihe) {
    throw new Error("Projektilla ei ole hyvaksymisPaatosVaihetta");
  }
  return hyvaksymisPaatosVaihe;
}

async function removeRejectionReasonIfExists(projekti: DBProjekti, hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe) {
  if (hyvaksymisPaatosVaihe.palautusSyy) {
    hyvaksymisPaatosVaihe.palautusSyy = null;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, hyvaksymisPaatosVaihe });
  }
}

class HyvaksymisPaatosVaiheTilaManager extends TilaManager {
  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("HyvaksymisPaatosVaihe on jo olemassa odottamassa hyväksyntää");
    }

    await removeRejectionReasonIfExists(projekti, getHyvaksymisPaatosVaihe(projekti));

    const julkaisu = asiakirjaAdapter.adaptHyvaksymisPaatosVaiheJulkaisu(projekti);
    julkaisu.tila = HyvaksymisPaatosVaiheTila.ODOTTAA_HYVAKSYNTAA;
    julkaisu.muokkaaja = muokkaaja.uid;

    julkaisu.hyvaksymisPaatosVaihePDFt = await this.generatePDFs(projekti, julkaisu);

    await projektiDatabase.insertHyvaksymisPaatosVaiheJulkaisu(projekti.oid, julkaisu);
  }

  async approve(projekti: DBProjekti, projektiPaallikko: NykyinenKayttaja): Promise<void> {
    const hyvaksymisPaatosVaihe = getHyvaksymisPaatosVaihe(projekti);
    const julkaisu = asiakirjaAdapter.findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei hyvaksymisPaatosVaihetta odottamassa hyväksyntää");
    }
    await removeRejectionReasonIfExists(projekti, hyvaksymisPaatosVaihe);
    julkaisu.tila = HyvaksymisPaatosVaiheTila.HYVAKSYTTY;
    julkaisu.hyvaksyja = projektiPaallikko.uid;

    await projektiDatabase.saveProjekti({ oid: projekti.oid, ajastettuTarkistus: this.getNextAjastettuTarkistus(julkaisu, true) });

    await projektiDatabase.updateHyvaksymisPaatosVaiheJulkaisu(projekti, julkaisu);
    await aineistoService.publishHyvaksymisPaatosVaihe(projekti.oid, julkaisu.id);
  }

  private getNextAjastettuTarkistus(julkaisu: HyvaksymisPaatosVaiheJulkaisu, isHyvaksymisPaatos) {
    if (isHyvaksymisPaatos) {
      return parseAndAddDate(julkaisu.kuulutusVaihePaattyyPaiva, HYVAKSYMISPAATOS_DURATION_VALUE, HYVAKSYMISPAATOS_DURATION_UNIT).format();
    }
    return parseAndAddDate(julkaisu.kuulutusVaihePaattyyPaiva, JATKOPAATOS_DURATION_VALUE, JATKOPAATOS_DURATION_UNIT).format();
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisu = asiakirjaAdapter.findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei hyvaksymisPaatosVaihetta odottamassa hyväksyntää");
    }

    const hyvaksymisPaatosVaihe = getHyvaksymisPaatosVaihe(projekti);
    hyvaksymisPaatosVaihe.palautusSyy = syy;

    await this.deletePDFs(projekti.oid, hyvaksymisPaatosVaihe.hyvaksymisPaatosVaihePDFt);

    await projektiDatabase.saveProjekti({ oid: projekti.oid, hyvaksymisPaatosVaihe });
    await projektiDatabase.deleteHyvaksymisPaatosVaiheJulkaisu(projekti, julkaisu.id);
  }

  private async generatePDFs(
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

    const pdfs = {};
    pdfs[kielitiedot.ensisijainenKieli] = await generatePDFsForLanguage(kielitiedot.ensisijainenKieli, julkaisuWaitingForApproval);

    if (kielitiedot.toissijainenKieli) {
      pdfs[kielitiedot.toissijainenKieli] = await generatePDFsForLanguage(kielitiedot.toissijainenKieli, julkaisuWaitingForApproval);
    }
    return pdfs;
  }

  private async deletePDFs(oid: string, pdft: LocalizedMap<HyvaksymisPaatosVaihePDF>) {
    for (const language in pdft) {
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
}

export const hyvaksymisPaatosVaiheTilaManager = new HyvaksymisPaatosVaiheTilaManager();
