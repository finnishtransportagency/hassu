import { Status } from "hassu-common/graphql/apiModel";
import {
  AloitusKuulutusTiedostoManager,
  HyvaksymisPaatosVaiheTiedostoManager,
  JatkoPaatos1VaiheTiedostoManager,
  JatkoPaatos2VaiheTiedostoManager,
  NahtavillaoloVaiheTiedostoManager,
  LausuntoPyyntoTiedostoManager,
  LausuntoPyynnonTaydennyksetTiedostoManager,
  VuorovaikutusKierrosTiedostoManager,
  VuorovaikutusKierrosJulkaisuTiedostoManager,
} from ".";
import { DBProjekti } from "../../database/model";
import hyvaksymisesitysAineistoImportPending from "../../HyvaksymisEsitys/aineistoImportPending";
import ennakkoneuvotteluAineistoImportPending from "../../ennakkoneuvottelu/aineistoImportPending";

export class ProjektiTiedostoManager {
  private readonly projekti: DBProjekti;

  constructor(projekti: DBProjekti) {
    this.projekti = projekti;
  }

  isReady(): boolean {
    return (
      this.getAloitusKuulutusVaihe().isReady() &&
      this.getVuorovaikutusKierros().isReady() &&
      this.getNahtavillaoloVaihe().isReady() &&
      this.getHyvaksymisPaatosVaihe().isReady() &&
      this.getJatkoPaatos1Vaihe().isReady() &&
      this.getJatkoPaatos2Vaihe().isReady() &&
      this.getLausuntoPyynnot().isReady() &&
      this.getLausuntoPyynnonTaydennykset().isReady() &&
      !hyvaksymisesitysAineistoImportPending(this.projekti) &&
      !ennakkoneuvotteluAineistoImportPending(this.projekti)
    );
  }

  getAloitusKuulutusVaihe(): AloitusKuulutusTiedostoManager {
    return new AloitusKuulutusTiedostoManager(this.projekti.oid, this.projekti.aloitusKuulutus, this.projekti.aloitusKuulutusJulkaisut);
  }

  getNahtavillaoloVaihe(): NahtavillaoloVaiheTiedostoManager {
    return new NahtavillaoloVaiheTiedostoManager(
      this.projekti.oid,
      this.projekti.nahtavillaoloVaihe,
      this.projekti.nahtavillaoloVaiheJulkaisut
    );
  }

  getLausuntoPyynnot(): LausuntoPyyntoTiedostoManager {
    return new LausuntoPyyntoTiedostoManager(
      this.projekti.oid,
      this.projekti.lausuntoPyynnot,
      this.projekti.nahtavillaoloVaihe,
      this.projekti.nahtavillaoloVaiheJulkaisut
    );
  }

  getLausuntoPyynnonTaydennykset(): LausuntoPyynnonTaydennyksetTiedostoManager {
    return new LausuntoPyynnonTaydennyksetTiedostoManager(this.projekti.oid, this.projekti.lausuntoPyynnonTaydennykset);
  }

  getVuorovaikutusKierros(): VuorovaikutusKierrosTiedostoManager {
    return new VuorovaikutusKierrosTiedostoManager(
      this.projekti.oid,
      this.projekti.vuorovaikutusKierros,
      this.projekti.vuorovaikutusKierrosJulkaisut,
      this.getNahtavillaoloVaihe()
    );
  }

  getVuorovaikutusKierrosJulkaisut(): VuorovaikutusKierrosJulkaisuTiedostoManager[] {
    return (
      this.projekti.vuorovaikutusKierrosJulkaisut?.map(
        (julkaisu) => new VuorovaikutusKierrosJulkaisuTiedostoManager(this.projekti.oid, julkaisu)
      ) ?? []
    );
  }

  getHyvaksymisPaatosVaihe(): HyvaksymisPaatosVaiheTiedostoManager {
    return new HyvaksymisPaatosVaiheTiedostoManager(
      this.projekti.oid,
      this.projekti.hyvaksymisPaatosVaihe,
      this.projekti.hyvaksymisPaatosVaiheJulkaisut,
      Status.EPAAKTIIVINEN_1
    );
  }

  getJatkoPaatos1Vaihe(): JatkoPaatos1VaiheTiedostoManager {
    return new JatkoPaatos1VaiheTiedostoManager(
      this.projekti.oid,
      this.projekti.jatkoPaatos1Vaihe,
      this.projekti.jatkoPaatos1VaiheJulkaisut,
      Status.EPAAKTIIVINEN_2
    );
  }

  getJatkoPaatos2Vaihe(): JatkoPaatos2VaiheTiedostoManager {
    return new JatkoPaatos2VaiheTiedostoManager(
      this.projekti.oid,
      this.projekti.jatkoPaatos2Vaihe,
      this.projekti.jatkoPaatos2VaiheJulkaisut,
      Status.EPAAKTIIVINEN_3
    );
  }
}
