import { assertIsDefined } from "../util/assertions";
import { AloituskuulutusKutsuAdapter } from "../asiakirja/adapter/aloituskuulutusKutsuAdapter";
import { pickCommonAdapterProps } from "../asiakirja/adapter/commonKutsuAdapter";
import { Kayttaja, Kieli, LaskuriTyyppi } from "hassu-common/graphql/apiModel";
import { calculateEndDate } from "../endDateCalculator/endDateCalculatorHandler";
import { AloitusKuulutusJulkaisu, DBProjekti } from "../database/model";
import { createAloituskuulutusHyvaksyttyEmail, createAloituskuulutusHyvaksyttyPDFEmail } from "./emailTemplates";
import { createAloituskuulutusLahetekirjeEmail } from "./lahetekirje/lahetekirjeEmailTemplate";
import { EmailOptions } from "./model/emailOptions";

export class AloituskuulutusEmailCreator {
  private adapter!: AloituskuulutusKutsuAdapter;

  private constructor() {
    // Ignore
  }

  static async newInstance(projekti: DBProjekti, aloituskuulutus: AloitusKuulutusJulkaisu): Promise<AloituskuulutusEmailCreator> {
    return new AloituskuulutusEmailCreator().asyncConstructor(projekti, aloituskuulutus);
  }

  private async asyncConstructor(projekti: DBProjekti, aloituskuulutus: AloitusKuulutusJulkaisu) {
    assertIsDefined(projekti.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
    assertIsDefined(aloituskuulutus.kuulutusPaiva);
    assertIsDefined(aloituskuulutus.hankkeenKuvaus);
    this.adapter = new AloituskuulutusKutsuAdapter({
      ...pickCommonAdapterProps(projekti, aloituskuulutus.hankkeenKuvaus, Kieli.SUOMI),
      ...aloituskuulutus,
      kuulutusPaiva: aloituskuulutus.kuulutusPaiva,
      kuulutusVaihePaattyyPaiva: await calculateEndDate({
        alkupaiva: aloituskuulutus.kuulutusPaiva,
        tyyppi: LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA,
      }),
    });
    return this;
  }

  createHyvaksyttyEmailMuokkaajalle(muokkaaja: Kayttaja): EmailOptions {
    return createAloituskuulutusHyvaksyttyEmail(this.adapter, muokkaaja);
  }

  createHyvaksyttyEmail(): EmailOptions {
    return createAloituskuulutusHyvaksyttyPDFEmail(this.adapter);
  }

  createLahetekirje(): EmailOptions {
    return createAloituskuulutusLahetekirjeEmail(this.adapter);
  }
}
