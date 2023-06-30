import { assertIsDefined } from "../util/assertions";
import { Kayttaja, Kieli } from "../../../common/graphql/apiModel";
import { DBProjekti, HyvaksymisPaatosVaiheJulkaisu } from "../database/model";
import {
  createHyvaksymispaatosHyvaksyttyLaatijalleEmail,
  createHyvaksymispaatosHyvaksyttyPaallikkolleEmail,
  createHyvaksymispaatosHyvaksyttyViranomaisilleEmail,
} from "./emailTemplates";
import { EmailOptions } from "./email";
import {
  createHyvaksymisPaatosVaiheKutsuAdapterProps,
  HyvaksymisPaatosVaiheKutsuAdapter,
} from "../asiakirja/adapter/hyvaksymisPaatosVaiheKutsuAdapter";

export class HyvaksymisPaatosEmailCreator {
  private adapter!: HyvaksymisPaatosVaiheKutsuAdapter;

  private constructor() {
    // Ignore
  }

  static async newInstance(projekti: DBProjekti, julkaisu: HyvaksymisPaatosVaiheJulkaisu): Promise<HyvaksymisPaatosEmailCreator> {
    return new HyvaksymisPaatosEmailCreator().asyncConstructor(projekti, julkaisu);
  }

  private async asyncConstructor(projekti: DBProjekti, julkaisu: HyvaksymisPaatosVaiheJulkaisu) {
    assertIsDefined(projekti.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
    assertIsDefined(julkaisu.kuulutusPaiva);
    this.adapter = new HyvaksymisPaatosVaiheKutsuAdapter(
      createHyvaksymisPaatosVaiheKutsuAdapterProps(
        projekti.oid,
        projekti.lyhytOsoite,
        projekti.kayttoOikeudet,
        Kieli.SUOMI,
        julkaisu,
        projekti.kasittelynTila
      )
    );
    return this;
  }

  createHyvaksyttyEmailMuokkaajalle(muokkaaja: Kayttaja): EmailOptions {
    return createHyvaksymispaatosHyvaksyttyLaatijalleEmail(this.adapter, muokkaaja);
  }

  createHyvaksyttyEmail(): EmailOptions {
    return createHyvaksymispaatosHyvaksyttyPaallikkolleEmail(this.adapter);
  }

  createHyvaksymispaatosHyvaksyttyViranomaisille(): EmailOptions {
    return createHyvaksymispaatosHyvaksyttyViranomaisilleEmail(this.adapter);
  }
}
