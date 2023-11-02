import {
  AloitusKuulutusTiedostoManager,
  HyvaksymisPaatosVaiheTiedostoManager,
  JatkoPaatos1VaiheTiedostoManager,
  JatkoPaatos2VaiheTiedostoManager,
  NahtavillaoloVaiheTiedostoManager,
  VuorovaikutusKierrosTiedostoManager,
  VuorovaikutusKierrosJulkaisuTiedostoManager,
} from ".";
import { DBProjekti } from "../../database/model";

export class ProjektiTiedostoManager {
  private projekti: DBProjekti;

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
      this.getJatkoPaatos2Vaihe().isReady()
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
      ) || []
    );
  }

  getHyvaksymisPaatosVaihe(): HyvaksymisPaatosVaiheTiedostoManager {
    return new HyvaksymisPaatosVaiheTiedostoManager(
      this.projekti.oid,
      this.projekti.hyvaksymisPaatosVaihe,
      this.projekti.hyvaksymisPaatosVaiheJulkaisut
    );
  }

  getJatkoPaatos1Vaihe(): JatkoPaatos1VaiheTiedostoManager {
    return new JatkoPaatos1VaiheTiedostoManager(
      this.projekti.oid,
      this.projekti.jatkoPaatos1Vaihe,
      this.projekti.jatkoPaatos1VaiheJulkaisut
    );
  }

  getJatkoPaatos2Vaihe(): JatkoPaatos2VaiheTiedostoManager {
    return new JatkoPaatos2VaiheTiedostoManager(
      this.projekti.oid,
      this.projekti.jatkoPaatos2Vaihe,
      this.projekti.jatkoPaatos2VaiheJulkaisut
    );
  }
}
