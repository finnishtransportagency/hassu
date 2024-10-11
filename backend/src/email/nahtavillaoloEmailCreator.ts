import { assertIsDefined } from "../util/assertions";
import { Kieli, LaskuriTyyppi } from "hassu-common/graphql/apiModel";
import { DBProjekti, NahtavillaoloVaiheJulkaisu } from "../database/model";
import { NahtavillaoloVaiheKutsuAdapter } from "../asiakirja/adapter/nahtavillaoloVaiheKutsuAdapter";
import { pickCommonAdapterProps } from "../asiakirja/adapter/commonKutsuAdapter";
import { calculateEndDate } from "../endDateCalculator/endDateCalculatorHandler";
import { createNahtavillaLahetekirjeEmail } from "./lahetekirje/lahetekirjeEmailTemplate";
import { fileService } from "../files/fileService";
import { EmailOptions } from "./model/emailOptions";
import { KuulutusEmailCreator } from "./kuulutusEmailCreator";

export class NahtavillaoloEmailCreator extends KuulutusEmailCreator {
  private projekti!: DBProjekti;
  private julkaisu!: NahtavillaoloVaiheJulkaisu;

  static async newInstance(projekti: DBProjekti, julkaisu: NahtavillaoloVaiheJulkaisu): Promise<NahtavillaoloEmailCreator> {
    return new NahtavillaoloEmailCreator().asyncConstructor(projekti, julkaisu);
  }

  private async asyncConstructor(projekti: DBProjekti, julkaisu: NahtavillaoloVaiheJulkaisu) {
    assertIsDefined(projekti.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
    assertIsDefined(julkaisu.kuulutusPaiva);
    assertIsDefined(julkaisu.hankkeenKuvaus);
    this.adapter = new NahtavillaoloVaiheKutsuAdapter({
      ...(await pickCommonAdapterProps(projekti, julkaisu.hankkeenKuvaus, Kieli.SUOMI)),
      ...julkaisu,
      kuulutusPaiva: julkaisu.kuulutusPaiva,
      kuulutusVaihePaattyyPaiva: await calculateEndDate({
        alkupaiva: julkaisu.kuulutusPaiva,
        tyyppi: LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA,
      }),
      kirjaamoOsoitteet: [],
    });
    this.projekti = projekti;
    this.julkaisu = julkaisu;
    return this;
  }

  createLahetekirje(): EmailOptions {
    return createNahtavillaLahetekirjeEmail(this.adapter as NahtavillaoloVaiheKutsuAdapter);
  }

  async createLahetekirjeWithAttachments(): Promise<EmailOptions> {
    const { oid, kielitiedot } = this.projekti;
    assertIsDefined(kielitiedot);
    const lahetekirje = this.createLahetekirje();
    // PDFt on jo olemassa
    const nahtavillakuulutusPDFtSUOMI = this.julkaisu.nahtavillaoloPDFt?.[Kieli.SUOMI];
    assertIsDefined(nahtavillakuulutusPDFtSUOMI);
    const { attachment: nahtavillakuulutusIlmoitusPDFSUOMI } = await fileService.getYllapitoFileAsAttachmentAndItsSize(
      oid,
      nahtavillakuulutusPDFtSUOMI.nahtavillaoloIlmoitusPDFPath
    );
    if (!nahtavillakuulutusIlmoitusPDFSUOMI) {
      throw new Error("NahtavillaKuulutusPDF SUOMI:n saaminen epäonnistui");
    }
    let nahtavillakuulutusIlmoitusPDFToinenKieli = undefined;
    const toinenKieli = [kielitiedot.ensisijainenKieli, kielitiedot.toissijainenKieli].includes(Kieli.RUOTSI) ? Kieli.RUOTSI : undefined;
    if (toinenKieli) {
      const nahtavillakuulutusPDFtToinenKieli = this.julkaisu.nahtavillaoloPDFt?.[toinenKieli];
      assertIsDefined(nahtavillakuulutusPDFtToinenKieli);
      nahtavillakuulutusIlmoitusPDFToinenKieli = (
        await fileService.getYllapitoFileAsAttachmentAndItsSize(oid, nahtavillakuulutusPDFtToinenKieli.nahtavillaoloIlmoitusPDFPath)
      ).attachment;
      if (!nahtavillakuulutusIlmoitusPDFToinenKieli) {
        throw new Error("NahtavillaKuulutusPDFToinenKieli:n saaminen epäonnistui");
      }
    }

    lahetekirje.attachments = [nahtavillakuulutusIlmoitusPDFSUOMI];
    if (nahtavillakuulutusIlmoitusPDFToinenKieli) {
      lahetekirje.attachments.push(nahtavillakuulutusIlmoitusPDFToinenKieli);
    }
    const pdfSaamePath = this.julkaisu.nahtavillaoloSaamePDFt?.[Kieli.POHJOISSAAME]?.kuulutusIlmoitusPDF?.tiedosto;
    if (pdfSaamePath) {
      const { attachment: saamePDF } = await fileService.getYllapitoFileAsAttachmentAndItsSize(oid, pdfSaamePath);
      if (!saamePDF) {
        throw new Error("NahtavillaKuulutusIlmoitusPDFSaame:n saaminen epäonnistui");
      }
      lahetekirje.attachments.push(saamePDF);
    }
    return lahetekirje;
  }
}
