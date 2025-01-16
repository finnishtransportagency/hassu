import { assertIsDefined } from "../util/assertions";
import { Kieli } from "hassu-common/graphql/apiModel";
import { DBProjekti, HyvaksymisPaatosVaiheJulkaisu } from "../database/model";
import { createHyvaksymispaatosHyvaksyttyViranomaisilleEmail, createJatkopaatosHyvaksyttyViranomaisilleEmail } from "./emailTemplates";
import {
  createHyvaksymisPaatosVaiheKutsuAdapterProps,
  HyvaksymisPaatosVaiheKutsuAdapter,
} from "../asiakirja/adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import { EmailOptions } from "./model/emailOptions";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { KuulutusEmailCreator } from "./kuulutusEmailCreator";
import { isProjektiAsianhallintaIntegrationEnabled } from "../util/isProjektiAsianhallintaIntegrationEnabled";
import { getLinkkiAsianhallintaan } from "../asianhallinta/getLinkkiAsianhallintaan";

export class HyvaksymisPaatosEmailCreator extends KuulutusEmailCreator {
  static async newInstance(
    projekti: DBProjekti,
    julkaisu: HyvaksymisPaatosVaiheJulkaisu,
    paatosTyyppi: PaatosTyyppi
  ): Promise<HyvaksymisPaatosEmailCreator> {
    return new HyvaksymisPaatosEmailCreator().asyncConstructor(projekti, julkaisu, paatosTyyppi);
  }

  private async asyncConstructor(projekti: DBProjekti, julkaisu: HyvaksymisPaatosVaiheJulkaisu, paatosTyyppi: PaatosTyyppi) {
    assertIsDefined(projekti.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
    assertIsDefined(julkaisu.kuulutusPaiva);
    this.adapter = new HyvaksymisPaatosVaiheKutsuAdapter(
      createHyvaksymisPaatosVaiheKutsuAdapterProps({
        projekti,
        kieli: Kieli.SUOMI,
        hyvaksymisPaatosVaihe: julkaisu,
        paatosTyyppi,
        asianhallintaPaalla: await isProjektiAsianhallintaIntegrationEnabled(projekti),
        linkkiAsianhallintaan: await getLinkkiAsianhallintaan(projekti),
        osoite: undefined,
        kuulutettuYhdessaSuunnitelmanimi: undefined,
      })
    );
    return this;
  }

  createHyvaksymispaatosHyvaksyttyViranomaisille(): EmailOptions {
    return createHyvaksymispaatosHyvaksyttyViranomaisilleEmail(this.adapter as HyvaksymisPaatosVaiheKutsuAdapter);
  }

  createJatkopaatosHyvaksyttyViranomaisille(): EmailOptions {
    return createJatkopaatosHyvaksyttyViranomaisilleEmail(this.adapter as HyvaksymisPaatosVaiheKutsuAdapter);
  }
}
