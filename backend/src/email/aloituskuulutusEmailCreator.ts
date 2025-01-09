import { assertIsDefined } from "../util/assertions";
import { AloituskuulutusKutsuAdapter } from "../asiakirja/adapter/aloituskuulutusKutsuAdapter";
import { pickCommonAdapterProps } from "../asiakirja/adapter/commonKutsuAdapter";
import { Kieli, LaskuriTyyppi } from "hassu-common/graphql/apiModel";
import { calculateEndDate } from "../endDateCalculator/endDateCalculatorHandler";
import { AloitusKuulutusJulkaisu, DBProjekti } from "../database/model";
import { createAloituskuulutusLahetekirjeEmail } from "./lahetekirje/lahetekirjeEmailTemplate";
import { EmailOptions } from "./model/emailOptions";
import { KuulutusEmailCreator } from "./kuulutusEmailCreator";

export class AloituskuulutusEmailCreator extends KuulutusEmailCreator {
  static async newInstance(projekti: DBProjekti, aloituskuulutus: AloitusKuulutusJulkaisu): Promise<AloituskuulutusEmailCreator> {
    return new AloituskuulutusEmailCreator().asyncConstructor(projekti, aloituskuulutus);
  }

  private async asyncConstructor(projekti: DBProjekti, aloituskuulutus: AloitusKuulutusJulkaisu) {
    assertIsDefined(projekti.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
    assertIsDefined(aloituskuulutus.kuulutusPaiva);
    assertIsDefined(aloituskuulutus.hankkeenKuvaus);
    this.adapter = new AloituskuulutusKutsuAdapter({
      ...(await pickCommonAdapterProps(projekti, aloituskuulutus.hankkeenKuvaus, Kieli.SUOMI)),
      ...aloituskuulutus,
      kuulutettuYhdessaSuunnitelmanimi: undefined,
      kuulutusPaiva: aloituskuulutus.kuulutusPaiva,
      kuulutusVaihePaattyyPaiva: await calculateEndDate({
        alkupaiva: aloituskuulutus.kuulutusPaiva,
        tyyppi: LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA,
      }),
    });
    return this;
  }

  createLahetekirje(): EmailOptions {
    return createAloituskuulutusLahetekirjeEmail(this.adapter as AloituskuulutusKutsuAdapter);
  }
}
