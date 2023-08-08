import { assertIsDefined } from "../util/assertions";
import { Kieli, LaskuriTyyppi } from "../../../common/graphql/apiModel";
import { DBProjekti, NahtavillaoloVaiheJulkaisu } from "../database/model";
import { createNahtavillaoloVaiheKuulutusHyvaksyttyPDFEmail } from "./emailTemplates";
import { EmailOptions } from "./email";
import { NahtavillaoloVaiheKutsuAdapter } from "../asiakirja/adapter/nahtavillaoloVaiheKutsuAdapter";
import { pickCommonAdapterProps } from "../asiakirja/adapter/commonKutsuAdapter";
import { calculateEndDate } from "../endDateCalculator/endDateCalculatorHandler";
import { createNahtavillaLahetekirjeEmail } from "./lahetekirje/lahetekirjeEmailTemplate";
import { getFileAttachment } from "../handler/email/emailHandler";

export class NahtavillaoloEmailCreator {
  private adapter!: NahtavillaoloVaiheKutsuAdapter;
  private projekti!: DBProjekti;
  private julkaisu!: NahtavillaoloVaiheJulkaisu;

  private constructor() {
    // Ignore
  }

  static async newInstance(projekti: DBProjekti, julkaisu: NahtavillaoloVaiheJulkaisu): Promise<NahtavillaoloEmailCreator> {
    return new NahtavillaoloEmailCreator().asyncConstructor(projekti, julkaisu);
  }

  private async asyncConstructor(projekti: DBProjekti, julkaisu: NahtavillaoloVaiheJulkaisu) {
    assertIsDefined(projekti.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
    assertIsDefined(julkaisu.kuulutusPaiva);
    assertIsDefined(julkaisu.hankkeenKuvaus);
    this.adapter = new NahtavillaoloVaiheKutsuAdapter({
      ...pickCommonAdapterProps(projekti, julkaisu.hankkeenKuvaus, Kieli.SUOMI),
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

  createHyvaksyttyEmail(): EmailOptions {
    return createNahtavillaoloVaiheKuulutusHyvaksyttyPDFEmail(this.adapter);
  }

  createLahetekirje(): EmailOptions {
    return createNahtavillaLahetekirjeEmail(this.adapter);
  }

  async createLahetekirjeWithAttachments(): Promise<EmailOptions> {
    const { oid, kielitiedot } = this.projekti;
    assertIsDefined(kielitiedot);
    const lahetekirje = this.createLahetekirje();
    // PDFt on jo olemassa
    const nahtavillakuulutusPDFtSUOMI = this.julkaisu.nahtavillaoloPDFt?.[Kieli.SUOMI];
    assertIsDefined(nahtavillakuulutusPDFtSUOMI);
    const nahtavillakuulutusIlmoitusPDFSUOMI = await getFileAttachment(oid, nahtavillakuulutusPDFtSUOMI.nahtavillaoloIlmoitusPDFPath);
    if (!nahtavillakuulutusIlmoitusPDFSUOMI) {
      throw new Error("NahtavillaKuulutusPDF SUOMI:n saaminen epäonnistui");
    }
    let nahtavillakuulutusIlmoitusPDFToinenKieli = undefined;
    const toinenKieli = [kielitiedot.ensisijainenKieli, kielitiedot.toissijainenKieli].includes(Kieli.RUOTSI) ? Kieli.RUOTSI : undefined;
    if (toinenKieli) {
      const nahtavillakuulutusPDFtToinenKieli = this.julkaisu.nahtavillaoloPDFt?.[toinenKieli];
      assertIsDefined(nahtavillakuulutusPDFtToinenKieli);
      nahtavillakuulutusIlmoitusPDFToinenKieli = await getFileAttachment(
        oid,
        nahtavillakuulutusPDFtToinenKieli.nahtavillaoloIlmoitusPDFPath
      );
      if (!nahtavillakuulutusIlmoitusPDFToinenKieli) {
        throw new Error("NahtavillaKuulutusPDFToinenKieli:n saaminen epäonnistui");
      }
    }

    lahetekirje.attachments = [nahtavillakuulutusIlmoitusPDFSUOMI];
    if (nahtavillakuulutusIlmoitusPDFToinenKieli) {
      lahetekirje.attachments.push(nahtavillakuulutusIlmoitusPDFToinenKieli);
    }
    return lahetekirje;
  }
}
