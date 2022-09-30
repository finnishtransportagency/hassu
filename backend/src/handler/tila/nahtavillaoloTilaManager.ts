import { AsiakirjaTyyppi, Kieli, NahtavillaoloVaiheTila, NykyinenKayttaja } from "../../../../common/graphql/apiModel";
import { TilaManager } from "./TilaManager";
import { DBProjekti, LocalizedMap, NahtavillaoloPDF, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { aineistoService } from "../../aineisto/aineistoService";
import { asiakirjaService, NahtavillaoloKuulutusAsiakirjaTyyppi } from "../../asiakirja/asiakirjaService";
import { fileService } from "../../files/fileService";
import { parseDate } from "../../util/dateUtil";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";

async function createNahtavillaoloVaihePDF(
  asiakirjaTyyppi: NahtavillaoloKuulutusAsiakirjaTyyppi,
  julkaisu: NahtavillaoloVaiheJulkaisu,
  projekti: DBProjekti,
  kieli: Kieli
) {
  if (!julkaisu.kuulutusPaiva) {
    throw new Error("julkaisu.kuulutusPaiva puuttuu");
  }
  const pdf = await asiakirjaService.createNahtavillaoloKuulutusPdf({
    asiakirjaTyyppi,
    projekti,
    nahtavillaoloVaihe: julkaisu,
    kieli,
    luonnos: false,
  });
  return fileService.createFileToProjekti({
    oid: projekti.oid,
    filePathInProjekti: ProjektiPaths.PATH_NAHTAVILLAOLO,
    fileName: pdf.nimi,
    contents: Buffer.from(pdf.sisalto, "base64"),
    inline: true,
    contentType: "application/pdf",
    publicationTimestamp: parseDate(julkaisu.kuulutusPaiva),
    copyToPublic: true,
  });
}

function getNahtavillaoloVaihe(projekti: DBProjekti): NahtavillaoloVaihe {
  const nahtavillaoloVaihe = projekti.nahtavillaoloVaihe;
  if (!nahtavillaoloVaihe) {
    throw new Error("Projektilla ei ole nahtavillaolovaihetta");
  }
  return nahtavillaoloVaihe;
}

async function removeRejectionReasonIfExists(projekti: DBProjekti, nahtavillaoloVaihe: NahtavillaoloVaihe) {
  if (nahtavillaoloVaihe.palautusSyy) {
    nahtavillaoloVaihe.palautusSyy = null;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, nahtavillaoloVaihe });
  }
}

class NahtavillaoloTilaManager extends TilaManager {
  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findNahtavillaoloWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("Nahtavillaolovaihe on jo olemassa odottamassa hyväksyntää");
    }

    await removeRejectionReasonIfExists(projekti, getNahtavillaoloVaihe(projekti));

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

    nahtavillaoloVaiheJulkaisu.tila = NahtavillaoloVaiheTila.ODOTTAA_HYVAKSYNTAA;
    nahtavillaoloVaiheJulkaisu.muokkaaja = muokkaaja.uid;

    nahtavillaoloVaiheJulkaisu.nahtavillaoloPDFt = await this.generatePDFs(projekti, nahtavillaoloVaiheJulkaisu);

    await projektiDatabase.insertNahtavillaoloVaiheJulkaisu(projekti.oid, nahtavillaoloVaiheJulkaisu);
  }

  async approve(projekti: DBProjekti, projektiPaallikko: NykyinenKayttaja): Promise<void> {
    const nahtavillaoloVaihe = getNahtavillaoloVaihe(projekti);
    const julkaisuWaitingForApproval = asiakirjaAdapter.findNahtavillaoloWaitingForApproval(projekti);
    if (!julkaisuWaitingForApproval) {
      throw new Error("Ei nähtävilläolovaihetta odottamassa hyväksyntää");
    }
    await removeRejectionReasonIfExists(projekti, nahtavillaoloVaihe);
    julkaisuWaitingForApproval.tila = NahtavillaoloVaiheTila.HYVAKSYTTY;
    julkaisuWaitingForApproval.hyvaksyja = projektiPaallikko.uid;

    await projektiDatabase.updateNahtavillaoloVaiheJulkaisu(projekti, julkaisuWaitingForApproval);
    await aineistoService.publishNahtavillaolo(projekti.oid, julkaisuWaitingForApproval.id);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findNahtavillaoloWaitingForApproval(projekti);
    if (!julkaisuWaitingForApproval) {
      throw new Error("Ei nähtävilläolovaihetta odottamassa hyväksyntää");
    }

    const nahtavillaoloVaihe = getNahtavillaoloVaihe(projekti);
    nahtavillaoloVaihe.palautusSyy = syy;
    if (!julkaisuWaitingForApproval.nahtavillaoloPDFt) {
      throw new Error("julkaisuWaitingForApproval.nahtavillaoloPDFt puuttuu");
    }
    await this.deletePDFs(projekti.oid, julkaisuWaitingForApproval.nahtavillaoloPDFt);

    await projektiDatabase.saveProjekti({ oid: projekti.oid, nahtavillaoloVaihe });
    await projektiDatabase.deleteNahtavillaoloVaiheJulkaisu(projekti, julkaisuWaitingForApproval.id);
  }

  private async generatePDFs(
    projekti: DBProjekti,
    julkaisuWaitingForApproval: NahtavillaoloVaiheJulkaisu
  ): Promise<LocalizedMap<NahtavillaoloPDF>> {
    const kielitiedot = julkaisuWaitingForApproval.kielitiedot;

    async function generatePDFsForLanguage(kieli: Kieli, julkaisu: NahtavillaoloVaiheJulkaisu): Promise<NahtavillaoloPDF> {
      const nahtavillaoloPDFPath = await createNahtavillaoloVaihePDF(AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS, julkaisu, projekti, kieli);
      const nahtavillaoloIlmoitusPDFPath = await createNahtavillaoloVaihePDF(
        AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE,
        julkaisu,
        projekti,
        kieli
      );
      const nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath = await createNahtavillaoloVaihePDF(
        AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
        julkaisu,
        projekti,
        kieli
      );
      return { nahtavillaoloPDFPath, nahtavillaoloIlmoitusPDFPath, nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath };
    }

    const pdfs: LocalizedMap<NahtavillaoloPDF> = {};
    pdfs[kielitiedot.ensisijainenKieli] = await generatePDFsForLanguage(kielitiedot.ensisijainenKieli, julkaisuWaitingForApproval);

    if (kielitiedot.toissijainenKieli) {
      pdfs[kielitiedot.toissijainenKieli] = await generatePDFsForLanguage(kielitiedot.toissijainenKieli, julkaisuWaitingForApproval);
    }
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
      });
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: pdfs.nahtavillaoloIlmoitusPDFPath,
      });
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: pdfs.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath,
      });
    }
  }
}

export const nahtavillaoloTilaManager = new NahtavillaoloTilaManager();
