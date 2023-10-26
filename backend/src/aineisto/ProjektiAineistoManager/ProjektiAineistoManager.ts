import {
  AloitusKuulutusAineisto,
  HyvaksymisPaatosVaiheAineisto,
  JatkoPaatos1VaiheAineisto,
  JatkoPaatos2VaiheAineisto,
  LausuntoPyynnonTaydennyksetAineisto,
  LausuntoPyyntoAineisto,
  NahtavillaoloVaiheAineisto,
  VuorovaikutusKierrosAineisto,
  VuorovaikutusKierrosJulkaisuAineisto,
} from ".";
import { DBProjekti } from "../../database/model";

export class ProjektiAineistoManager {
  private projekti: DBProjekti;

  constructor(projekti: DBProjekti) {
    this.projekti = projekti;
  }

  isReady(): boolean {
    return (
      this.getAloitusKuulutusVaihe().isReady() &&
      this.getVuorovaikutusKierros().isReady() &&
      this.getNahtavillaoloVaihe().isReady() &&
      this.getLausuntoPyynnot().isReady() &&
      this.getLausuntoPyynnot().isReady() &&
      this.getHyvaksymisPaatosVaihe().isReady() &&
      this.getJatkoPaatos1Vaihe().isReady() &&
      this.getJatkoPaatos2Vaihe().isReady()
    );
  }

  getAloitusKuulutusVaihe(): AloitusKuulutusAineisto {
    return new AloitusKuulutusAineisto(this.projekti.oid, this.projekti.aloitusKuulutus, this.projekti.aloitusKuulutusJulkaisut);
  }

  getNahtavillaoloVaihe(): NahtavillaoloVaiheAineisto {
    return new NahtavillaoloVaiheAineisto(this.projekti.oid, this.projekti.nahtavillaoloVaihe, this.projekti.nahtavillaoloVaiheJulkaisut);
  }

  getLausuntoPyynnot(): LausuntoPyyntoAineisto {
    return new LausuntoPyyntoAineisto(this.projekti.oid, this.projekti.lausuntoPyynnot);
  }

  getLausuntoPyynnonTaydennykset(): LausuntoPyynnonTaydennyksetAineisto {
    return new LausuntoPyynnonTaydennyksetAineisto(this.projekti.oid, this.projekti.lausuntoPyynnonTaydennykset);
  }

  getVuorovaikutusKierros(): VuorovaikutusKierrosAineisto {
    return new VuorovaikutusKierrosAineisto(
      this.projekti.oid,
      this.projekti.vuorovaikutusKierros,
      this.projekti.vuorovaikutusKierrosJulkaisut,
      this.getNahtavillaoloVaihe()
    );
  }

  getVuorovaikutusKierrosJulkaisut(): VuorovaikutusKierrosJulkaisuAineisto[] {
    return (
      this.projekti.vuorovaikutusKierrosJulkaisut?.map(
        (julkaisu) => new VuorovaikutusKierrosJulkaisuAineisto(this.projekti.oid, julkaisu)
      ) || []
    );
  }

  getHyvaksymisPaatosVaihe(): HyvaksymisPaatosVaiheAineisto {
    return new HyvaksymisPaatosVaiheAineisto(
      this.projekti.oid,
      this.projekti.hyvaksymisPaatosVaihe,
      this.projekti.hyvaksymisPaatosVaiheJulkaisut
    );
  }

  getJatkoPaatos1Vaihe(): JatkoPaatos1VaiheAineisto {
    return new JatkoPaatos1VaiheAineisto(this.projekti.oid, this.projekti.jatkoPaatos1Vaihe, this.projekti.jatkoPaatos1VaiheJulkaisut);
  }

  getJatkoPaatos2Vaihe(): JatkoPaatos2VaiheAineisto {
    return new JatkoPaatos2VaiheAineisto(this.projekti.oid, this.projekti.jatkoPaatos2Vaihe, this.projekti.jatkoPaatos2VaiheJulkaisut);
  }
}
