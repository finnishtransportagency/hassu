import { assertIsDefined } from "../util/assertions";
import { Kayttaja, Kieli } from "hassu-common/graphql/apiModel";
import { DBProjekti, HyvaksymisPaatosVaiheJulkaisu } from "../database/model";
import {
  createHyvaksymispaatosHyvaksyttyLaatijalleEmail,
  createHyvaksymispaatosHyvaksyttyPaallikkolleEmail,
  createHyvaksymispaatosHyvaksyttyViranomaisilleEmail,
  createjatkopaatosHyvaksyttyPaallikkolleEmail,
  createJatkopaatosHyvaksyttyViranomaisilleEmail,
} from "./emailTemplates";
import {
  createHyvaksymisPaatosVaiheKutsuAdapterProps,
  HyvaksymisPaatosVaiheKutsuAdapter,
} from "../asiakirja/adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import { EmailOptions } from "./model/emailOptions";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";

export class HyvaksymisPaatosEmailCreator {
  private adapter!: HyvaksymisPaatosVaiheKutsuAdapter;

  private constructor() {
    // Ignore
  }

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
      createHyvaksymisPaatosVaiheKutsuAdapterProps(projekti, Kieli.SUOMI, julkaisu, paatosTyyppi)
    );
    return this;
  }

  createHyvaksyttyEmailMuokkaajalle(muokkaaja: Kayttaja): EmailOptions {
    return createHyvaksymispaatosHyvaksyttyLaatijalleEmail(this.adapter, muokkaaja);
  }

  createHyvaksyttyEmail(): EmailOptions {
    return createHyvaksymispaatosHyvaksyttyPaallikkolleEmail(this.adapter);
  }

  createJatkopaatosHyvaksyttyEmail(): EmailOptions {
    return createjatkopaatosHyvaksyttyPaallikkolleEmail(this.adapter);
  }

  createHyvaksymispaatosHyvaksyttyViranomaisille(): EmailOptions {
    return createHyvaksymispaatosHyvaksyttyViranomaisilleEmail(this.adapter);
  }

  createJatkopaatosHyvaksyttyViranomaisille(): EmailOptions {
    return createJatkopaatosHyvaksyttyViranomaisilleEmail(this.adapter);
  }
}
