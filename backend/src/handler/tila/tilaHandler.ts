import { TilaSiirtymaInput, TilasiirtymaTyyppi } from "hassu-common/graphql/apiModel";
import { aloitusKuulutusTilaManager } from "./aloitusKuulutusTilaManager";
import { nahtavillaoloTilaManager } from "./nahtavillaoloTilaManager";
import { hyvaksymisPaatosVaiheTilaManager } from "./hyvaksymisPaatosVaiheTilaManager";
import { jatkoPaatos1VaiheTilaManager } from "./jatkoPaatos1VaiheTilaManager";
import { jatkoPaatos2VaiheTilaManager } from "./jatkoPaatos2VaiheTilaManager";
import { vuorovaikutusKierrosTilaManager } from "./vuorovaikutusKierrosTilaManager";
class TilaHandler {
  async siirraTila(input: TilaSiirtymaInput | undefined | null): Promise<void> {
    if (!input) {
      throw new Error("siirraTila: input ei määritelty");
    }
    switch (input.tyyppi) {
      case TilasiirtymaTyyppi.ALOITUSKUULUTUS:
        return aloitusKuulutusTilaManager.siirraTila(input);
      case TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS:
        return vuorovaikutusKierrosTilaManager.siirraTila(input);
      case TilasiirtymaTyyppi.NAHTAVILLAOLO:
        return nahtavillaoloTilaManager.siirraTila(input);
      case TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE:
        return hyvaksymisPaatosVaiheTilaManager.siirraTila(input);
      case TilasiirtymaTyyppi.JATKOPAATOS_1:
        return jatkoPaatos1VaiheTilaManager.siirraTila(input);
      case TilasiirtymaTyyppi.JATKOPAATOS_2:
        return jatkoPaatos2VaiheTilaManager.siirraTila(input);
    }
  }
}

export const tilaHandler = new TilaHandler();
