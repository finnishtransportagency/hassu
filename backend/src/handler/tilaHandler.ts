import { TilaSiirtymaInput, TilasiirtymaTyyppi } from "../../../common/graphql/apiModel";
import { aloitusKuulutusHandler } from "./aloitusKuulutusHandler";
import { nahtavillaoloHandler } from "./nahtavillaoloHandler";

class TilaHandler {
  async siirraTila(input: TilaSiirtymaInput) {
    switch (input.tyyppi) {
      case TilasiirtymaTyyppi.ALOITUSKUULUTUS:
        return aloitusKuulutusHandler.siirraTila(input);
      case TilasiirtymaTyyppi.NAHTAVILLAOLO:
        return nahtavillaoloHandler.siirraTila(input);
    }
  }
}

export const tilaHandler = new TilaHandler();
