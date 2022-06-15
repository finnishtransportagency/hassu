import { TilaSiirtymaInput, TilasiirtymaTyyppi } from "../../../../common/graphql/apiModel";
import { aloitusKuulutusTilaManager } from "./aloitusKuulutusTilaManager";
import { nahtavillaoloTilaManager } from "./nahtavillaoloTilaManager";

class TilaHandler {
  async siirraTila(input: TilaSiirtymaInput) {
    switch (input.tyyppi) {
      case TilasiirtymaTyyppi.ALOITUSKUULUTUS:
        return aloitusKuulutusTilaManager.siirraTila(input);
      case TilasiirtymaTyyppi.NAHTAVILLAOLO:
        return nahtavillaoloTilaManager.siirraTila(input);
    }
  }
}

export const tilaHandler = new TilaHandler();
