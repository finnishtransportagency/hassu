import { TilaSiirtymaInput, TilasiirtymaTyyppi } from "../../../../common/graphql/apiModel";
import { aloitusKuulutusTilaManager } from "./aloitusKuulutusTilaManager";
import { nahtavillaoloTilaManager } from "./nahtavillaoloTilaManager";
import { hyvaksymisPaatosVaiheTilaManager } from "./hyvaksymisPaatosVaiheTilaManager";

class TilaHandler {
  async siirraTila(input: TilaSiirtymaInput | undefined | null) {
    if (!input) {
      throw new Error("siirraTila: input ei määritelty");
    }
    switch (input.tyyppi) {
      case TilasiirtymaTyyppi.ALOITUSKUULUTUS:
        return aloitusKuulutusTilaManager.siirraTila(input);
      case TilasiirtymaTyyppi.NAHTAVILLAOLO:
        return nahtavillaoloTilaManager.siirraTila(input);
      case TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE:
        return hyvaksymisPaatosVaiheTilaManager.siirraTila(input);
      case TilasiirtymaTyyppi.JATKOPAATOS_1:
        return hyvaksymisPaatosVaiheTilaManager.siirraTila(input);
    }
  }
}

export const tilaHandler = new TilaHandler();
