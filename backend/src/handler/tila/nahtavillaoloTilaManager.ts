import { AsiakirjaTyyppi, Kieli, KuulutusJulkaisuTila, NykyinenKayttaja } from "../../../../common/graphql/apiModel";
import { TilaManager } from "./TilaManager";
import {
  DBProjekti,
  LocalizedMap,
  NahtavillaoloPDF,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  UudelleenkuulutusTila,
} from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { aineistoService } from "../../aineisto/aineistoService";
import { fileService } from "../../files/fileService";
import { dateToString, parseDate } from "../../util/dateUtil";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import assert from "assert";
import { pdfGeneratorClient } from "../../asiakirja/lambda/pdfGeneratorClient";
import { NahtavillaoloKuulutusAsiakirjaTyyppi } from "../../asiakirja/asiakirjaTypes";
import { findJulkaisuWithTila } from "../../projekti/projektiUtil";
import { projektiAdapter } from "../../projekti/adapter/projektiAdapter";
import { assertIsDefined } from "../../util/assertions";
import { isKuulutusPaivaInThePast } from "../../projekti/status/projektiJulkinenStatusHandler";
import dayjs from "dayjs";

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
    asiakirjaTyyppi,
    velho,
    suunnitteluSopimus: projekti.suunnitteluSopimus || undefined,
    kayttoOikeudet: projekti.kayttoOikeudet,
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

async function cleanupKuulutusBeforeApproval(projekti: DBProjekti, nahtavillaoloVaihe: NahtavillaoloVaihe) {
  if (nahtavillaoloVaihe.palautusSyy) {
    nahtavillaoloVaihe.palautusSyy = null;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, nahtavillaoloVaihe });
  }
}

async function cleanupAloitusKuulutusAfterApproval(projekti: DBProjekti, nahtavillaoloVaihe: NahtavillaoloVaihe) {
  if (nahtavillaoloVaihe.palautusSyy || nahtavillaoloVaihe.uudelleenKuulutus) {
    if (nahtavillaoloVaihe.palautusSyy) {
      nahtavillaoloVaihe.palautusSyy = null;
    }
    if (nahtavillaoloVaihe.uudelleenKuulutus) {
      nahtavillaoloVaihe.uudelleenKuulutus = null;
    }
    await projektiDatabase.saveProjekti({ oid: projekti.oid, nahtavillaoloVaihe });
  }
}

function validate(
  projekti: DBProjekti,
  nahtavillaoloVaihe: NahtavillaoloVaihe | null | undefined,
  hyvaksyttyJulkaisu: NahtavillaoloVaiheJulkaisu | undefined
) {
  // Tarkista, että on olemassa hyväksytty aloituskuulutusjulkaisu, jonka perua
  if (!hyvaksyttyJulkaisu) {
    throw new IllegalArgumentError("Ei ole olemassa kuulutusta, jota uudelleenkuuluttaa");
  }
  // Nähtävilläolovaiheen uudelleenkuuluttaminen on mahdollista vain jos hyväksymispäätöskuulutusta ei ole hyväksytty
  const apiProjekti = projektiAdapter.adaptProjekti(projekti);
  const hyvaksyttyHyvaksymisPaatos = findJulkaisuWithTila(apiProjekti.hyvaksymisPaatosVaiheJulkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
  if (hyvaksyttyHyvaksymisPaatos) {
    throw new IllegalArgumentError("Et voi uudelleenkuuluttaa nähtävilläolokuulutusta sillä hyväksymiskuulutus on jo hyväksytty");
  }
  assert(nahtavillaoloVaihe, "Projektilla pitäisi olla nahtavillaolokuulutus, jos sitä uudelleenkuulutetaan");
  // Uudelleenkuulutus ei ole mahdollista jos uudelleenkuulutus on jo olemassa
  if (nahtavillaoloVaihe.uudelleenKuulutus) {
    throw new IllegalArgumentError("Et voi uudelleenkuuluttaa nähtävilläolokuulutusta, koska uudelleenkuulutus on jo olemassa");
  }
}

class NahtavillaoloTilaManager extends TilaManager {
  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findNahtavillaoloWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("Nahtavillaolovaihe on jo olemassa odottamassa hyväksyntää");
    }

    await cleanupKuulutusBeforeApproval(projekti, getNahtavillaoloVaihe(projekti));

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

  async approve(projekti: DBProjekti, projektiPaallikko: NykyinenKayttaja): Promise<void> {
    const nahtavillaoloVaihe = getNahtavillaoloVaihe(projekti);
    const julkaisuWaitingForApproval = asiakirjaAdapter.findNahtavillaoloWaitingForApproval(projekti);
    if (!julkaisuWaitingForApproval) {
      throw new Error("Ei nähtävilläolovaihetta odottamassa hyväksyntää");
    }
    await cleanupAloitusKuulutusAfterApproval(projekti, nahtavillaoloVaihe);
    julkaisuWaitingForApproval.tila = KuulutusJulkaisuTila.HYVAKSYTTY;
    julkaisuWaitingForApproval.hyvaksyja = projektiPaallikko.uid;
    julkaisuWaitingForApproval.hyvaksymisPaiva = dateToString(dayjs());

    await projektiDatabase.nahtavillaoloVaiheJulkaisut.update(projekti, julkaisuWaitingForApproval);
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

  async uudelleenkuuluta(projekti: DBProjekti): Promise<void> {
    const hyvaksyttyJulkaisu = findJulkaisuWithTila(projekti.nahtavillaoloVaiheJulkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    const nahtavillaoloVaihe = projekti.nahtavillaoloVaihe;
    validate(projekti, nahtavillaoloVaihe, hyvaksyttyJulkaisu);
    assertIsDefined(nahtavillaoloVaihe);
    assertIsDefined(hyvaksyttyJulkaisu);

    const julkinenUudelleenKuulutus = isKuulutusPaivaInThePast(hyvaksyttyJulkaisu.kuulutusPaiva);

    let uudelleenKuulutus;
    if (julkinenUudelleenKuulutus) {
      uudelleenKuulutus = {
        tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
        alkuperainenHyvaksymisPaiva: hyvaksyttyJulkaisu.hyvaksymisPaiva || undefined,
      };
    } else {
      uudelleenKuulutus = {
        tila: UudelleenkuulutusTila.PERUUTETTU,
      };
    }
    nahtavillaoloVaihe.uudelleenKuulutus = uudelleenKuulutus;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, aloitusKuulutus: nahtavillaoloVaihe });
  }
}

export const nahtavillaoloTilaManager = new NahtavillaoloTilaManager();
