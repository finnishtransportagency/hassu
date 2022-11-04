import { AloitusKuulutusTila, AsiakirjaTyyppi, Kieli, NykyinenKayttaja, Status } from "../../../../common/graphql/apiModel";
import { projektiDatabase } from "../../database/projektiDatabase";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import {
  AloitusKuulutus,
  AloitusKuulutusJulkaisu,
  AloitusKuulutusPDF,
  DBProjekti,
  Kielitiedot,
  LocalizedMap,
  UudelleenkuulutusTila,
} from "../../database/model";
import { fileService } from "../../files/fileService";
import { dateToString, parseDate } from "../../util/dateUtil";
import { TilaManager } from "./TilaManager";
import { pdfGeneratorClient } from "../../asiakirja/lambda/pdfGeneratorClient";
import { findJulkaisutWithTila, findJulkaisuWithTila } from "../../projekti/projektiUtil";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import { projektiAdapter } from "../../projekti/adapter/projektiAdapter";
import assert from "assert";
import { isKuulutusPaivaInThePast } from "../../projekti/status/projektiJulkinenStatusHandler";
import dayjs from "dayjs";

async function createAloituskuulutusPDF(
  asiakirjaTyyppi: AsiakirjaTyyppi,
  julkaisuWaitingForApproval: AloitusKuulutusJulkaisu,
  projekti: DBProjekti,
  kieli: Kieli
) {
  if (!julkaisuWaitingForApproval.kuulutusPaiva) {
    throw new Error("julkaisuWaitingForApproval.kuulutusPaiva ei määritelty");
  }
  const pdf = await pdfGeneratorClient.createAloituskuulutusPdf({
    asiakirjaTyyppi,
    aloitusKuulutusJulkaisu: julkaisuWaitingForApproval,
    kieli,
    luonnos: false,
    kayttoOikeudet: projekti.kayttoOikeudet,
  });
  return fileService.createFileToProjekti({
    oid: projekti.oid,
    filePathInProjekti: "aloituskuulutus",
    fileName: pdf.nimi,
    contents: Buffer.from(pdf.sisalto, "base64"),
    inline: true,
    contentType: "application/pdf",
    publicationTimestamp: parseDate(julkaisuWaitingForApproval.kuulutusPaiva),
    copyToPublic: true,
  });
}

async function removeRejectionReasonIfExists(projekti: DBProjekti, aloitusKuulutus: AloitusKuulutus) {
  if (aloitusKuulutus.palautusSyy) {
    aloitusKuulutus.palautusSyy = null;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, aloitusKuulutus });
  }
}

function getAloitusKuulutus(projekti: DBProjekti) {
  const aloitusKuulutus = projekti.aloitusKuulutus;
  if (!aloitusKuulutus) {
    throw new Error("Projektilla ei ole aloituskuulutusta");
  }
  return aloitusKuulutus;
}

function validate(projekti: DBProjekti) {
  // Tarkista, että on olemassa hyväksytty aloituskuulutusjulkaisu, jonka perua
  const hyvaksyttyJulkaisu = findJulkaisuWithTila(projekti.aloitusKuulutusJulkaisut, AloitusKuulutusTila.HYVAKSYTTY);
  if (!hyvaksyttyJulkaisu) {
    throw new IllegalArgumentError("Ei ole olemassa kuulutusta, jota uudelleenkuuluttaa");
  }
  // Aloituskuulutuksen uudelleenkuuluttaminen on mahdollista vain jos projekti on ylläpidossa suunnitteluvaiheessa
  const apiProjekti = projektiAdapter.adaptProjekti(projekti);
  if (apiProjekti.status !== Status.SUUNNITTELU) {
    throw new IllegalArgumentError("Et voi uudelleenkuuluttaa aloistuskuulutusta projektin ollessa tässä tilassa:" + apiProjekti.status);
  }
  const aloitusKuulutus = projekti.aloitusKuulutus;
  assert(aloitusKuulutus, "Projektilla pitäisi olla aloituskuulutus, jos se on suunnittelutilassa");
  // Uudelleenkuulutus ei ole mahdollista jos uudelleenkuulutus on jo olemassa
  if (aloitusKuulutus.uudelleenKuulutus) {
    throw new IllegalArgumentError("Et voi uudelleenkuuluttaa aloistuskuulutusta, koska uudelleenkuulutus on jo olemassa");
  }
  return { hyvaksyttyJulkaisu, aloitusKuulutus };
}

class AloitusKuulutusTilaManager extends TilaManager {
  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findAloitusKuulutusWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("Aloituskuulutus on jo olemassa odottamassa hyväksyntää");
    }

    await removeRejectionReasonIfExists(projekti, getAloitusKuulutus(projekti));

    const aloitusKuulutusJulkaisu = asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti);
    aloitusKuulutusJulkaisu.tila = AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA;
    aloitusKuulutusJulkaisu.muokkaaja = muokkaaja.uid;

    await this.generatePDFs(projekti, aloitusKuulutusJulkaisu);

    await projektiDatabase.aloitusKuulutusJulkaisut.insert(projekti.oid, aloitusKuulutusJulkaisu);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisuWaitingForApproval: AloitusKuulutusJulkaisu | undefined =
      asiakirjaAdapter.findAloitusKuulutusWaitingForApproval(projekti);
    if (!julkaisuWaitingForApproval) {
      throw new Error("Ei aloituskuulutusta odottamassa hyväksyntää");
    }

    const aloitusKuulutus = getAloitusKuulutus(projekti);
    aloitusKuulutus.palautusSyy = syy;
    // aloituskuulutusPDF:t on määritelty kyllä tässä kohtaa
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await this.deletePDFs(projekti.oid, julkaisuWaitingForApproval.aloituskuulutusPDFt);
    await projektiDatabase.saveProjekti({ oid: projekti.oid, aloitusKuulutus });
    await projektiDatabase.aloitusKuulutusJulkaisut.delete(projekti, julkaisuWaitingForApproval.id);
  }

  async approve(projekti: DBProjekti, projektiPaallikko: NykyinenKayttaja): Promise<void> {
    const aloitusKuulutus = getAloitusKuulutus(projekti);
    const julkaisuWaitingForApproval = asiakirjaAdapter.findAloitusKuulutusWaitingForApproval(projekti);
    if (!julkaisuWaitingForApproval) {
      throw new Error("Ei aloituskuulutusta odottamassa hyväksyntää");
    }
    await removeRejectionReasonIfExists(projekti, aloitusKuulutus);
    julkaisuWaitingForApproval.tila = AloitusKuulutusTila.HYVAKSYTTY;
    julkaisuWaitingForApproval.hyvaksyja = projektiPaallikko.uid;
    julkaisuWaitingForApproval.hyvaksymisPaiva = dateToString(dayjs());

    await projektiDatabase.aloitusKuulutusJulkaisut.update(projekti, julkaisuWaitingForApproval);

    const logoFilePath = projekti.suunnitteluSopimus?.logo;
    if (logoFilePath) {
      assert(julkaisuWaitingForApproval.kuulutusPaiva, "kuulutusPaiva on oltava tässä kohtaa");
      await fileService.publishProjektiFile(projekti.oid, logoFilePath, logoFilePath, parseDate(julkaisuWaitingForApproval.kuulutusPaiva));
    }

    // Jos uudelleenkuulutus, peruuta olemassaoleva julkaistu kuulutus
    if (aloitusKuulutus.uudelleenKuulutus) {
      const julkaisutToCancel = findJulkaisutWithTila(projekti.aloitusKuulutusJulkaisut, AloitusKuulutusTila.HYVAKSYTTY);
      if (julkaisutToCancel) {
        for (const julkaisuToCancel of julkaisutToCancel) {
          if (julkaisuToCancel.id !== julkaisuWaitingForApproval.id) {
            julkaisuToCancel.tila = AloitusKuulutusTila.PERUUTETTU;
            await projektiDatabase.aloitusKuulutusJulkaisut.update(projekti, julkaisuToCancel);
          }
        }
      }
    }
  }

  private async generatePDFs(projekti: DBProjekti, julkaisuWaitingForApproval: AloitusKuulutusJulkaisu) {
    // kielitiedot on oltava
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const kielitiedot: Kielitiedot = julkaisuWaitingForApproval.kielitiedot;

    async function generatePDFsForLanguage(kieli: Kieli, julkaisu: AloitusKuulutusJulkaisu): Promise<AloitusKuulutusPDF> {
      const aloituskuulutusPDFPath = createAloituskuulutusPDF(AsiakirjaTyyppi.ALOITUSKUULUTUS, julkaisu, projekti, kieli);
      const aloituskuulutusIlmoitusPDFPath = createAloituskuulutusPDF(AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, julkaisu, projekti, kieli);
      return { aloituskuulutusPDFPath: await aloituskuulutusPDFPath, aloituskuulutusIlmoitusPDFPath: await aloituskuulutusIlmoitusPDFPath };
    }

    julkaisuWaitingForApproval.aloituskuulutusPDFt = {};
    julkaisuWaitingForApproval.aloituskuulutusPDFt[kielitiedot.ensisijainenKieli] = await generatePDFsForLanguage(
      kielitiedot.ensisijainenKieli,
      julkaisuWaitingForApproval
    );

    if (kielitiedot.toissijainenKieli) {
      julkaisuWaitingForApproval.aloituskuulutusPDFt[kielitiedot.toissijainenKieli] = await generatePDFsForLanguage(
        kielitiedot.toissijainenKieli,
        julkaisuWaitingForApproval
      );
    }
  }

  private async deletePDFs(oid: string, localizedPDFs: LocalizedMap<AloitusKuulutusPDF>) {
    for (const language in localizedPDFs) {
      // localizedPDFs ei ole null, ja language on tyyppiä Kieli, joka on localizedPDFs:n avain
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const pdfs: AloitusKuulutusPDF = localizedPDFs[language];
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: pdfs.aloituskuulutusPDFPath,
      });
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: pdfs.aloituskuulutusIlmoitusPDFPath,
      });
    }
  }

  async uudelleenkuuluta(projekti: DBProjekti): Promise<void> {
    const { hyvaksyttyJulkaisu, aloitusKuulutus } = validate(projekti);

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
    aloitusKuulutus.uudelleenKuulutus = uudelleenKuulutus;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, aloitusKuulutus });
  }
}

export const aloitusKuulutusTilaManager = new AloitusKuulutusTilaManager();
