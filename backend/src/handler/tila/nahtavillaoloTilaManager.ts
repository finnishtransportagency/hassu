import { AsiakirjaTyyppi, Kieli, NahtavillaoloVaiheTila, NykyinenKayttaja } from "../../../../common/graphql/apiModel";
import { TilaManager } from "./TilaManager";
import {
  DBProjekti,
  LocalizedMap,
  NahtavillaoloPDF,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
} from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { aineistoService } from "../../aineisto/aineistoService";
import { asiakirjaService, NahtavillaoloKuulutusAsiakirjaTyyppi } from "../../asiakirja/asiakirjaService";
import { fileService } from "../../files/fileService";
import { parseDate } from "../../util/dateUtil";

async function createNahtavillaoloVaihePDF(
  asiakirjaTyyppi: NahtavillaoloKuulutusAsiakirjaTyyppi,
  julkaisu: NahtavillaoloVaiheJulkaisu,
  projekti: DBProjekti,
  kieli: Kieli
) {
  const pdf = await asiakirjaService.createNahtavillaoloKuulutusPdf({
    asiakirjaTyyppi,
    projekti,
    nahtavillaoloVaihe: julkaisu,
    kieli,
    luonnos: false,
  });
  return fileService.createFileToProjekti({
    oid: projekti.oid,
    filePathInProjekti: "nahtavillaolo",
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

    await this.deletePDFs(projekti.oid, nahtavillaoloVaihe.nahtavillaoloPDFt);

    await projektiDatabase.saveProjekti({ oid: projekti.oid, nahtavillaoloVaihe });
    await projektiDatabase.deleteNahtavillaoloVaiheJulkaisu(projekti, julkaisuWaitingForApproval.id);
  }

  private async generatePDFs(
    projekti: DBProjekti,
    julkaisuWaitingForApproval: NahtavillaoloVaiheJulkaisu
  ): Promise<LocalizedMap<NahtavillaoloPDF>> {
    const kielitiedot = julkaisuWaitingForApproval.kielitiedot;

    async function generatePDFsForLanguage(
      kieli: Kieli,
      julkaisu: NahtavillaoloVaiheJulkaisu
    ): Promise<NahtavillaoloPDF> {
      const nahtavillaoloPDFPath = await createNahtavillaoloVaihePDF(
        AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS,
        julkaisu,
        projekti,
        kieli
      );
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

    const pdfs = {};
    pdfs[kielitiedot.ensisijainenKieli] = await generatePDFsForLanguage(
      kielitiedot.ensisijainenKieli,
      julkaisuWaitingForApproval
    );

    if (kielitiedot.toissijainenKieli) {
      pdfs[kielitiedot.toissijainenKieli] = await generatePDFsForLanguage(
        kielitiedot.toissijainenKieli,
        julkaisuWaitingForApproval
      );
    }
    return pdfs;
  }

  private async deletePDFs(oid: string, nahtavillaoloPDFt: LocalizedMap<NahtavillaoloPDF>) {
    for (const language in nahtavillaoloPDFt) {
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
