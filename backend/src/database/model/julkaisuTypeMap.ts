import type { AloitusKuulutusJulkaisu } from "./aloituskuulutus";
import type { NahtavillaoloVaiheJulkaisu } from "./nahtavillaoloVaihe";
import type { HyvaksymisPaatosVaiheJulkaisu, JatkoPaatos1VaiheJulkaisu, JatkoPaatos2VaiheJulkaisu } from "./hyvaksymisPaatosVaihe";

import {
  aloitusVaiheJulkaisuPrefix,
  nahtavillaoloVaiheJulkaisuPrefix,
  hyvaksymisPaatosVaiheJulkaisuPrefix,
  jatkopaatos1VaiheJulkaisuPrefix,
  jatkopaatos2VaiheJulkaisuPrefix,
} from "./julkaisuPrefixes";

export interface JulkaisuTypeMap {
  [aloitusVaiheJulkaisuPrefix]: AloitusKuulutusJulkaisu;
  [nahtavillaoloVaiheJulkaisuPrefix]: NahtavillaoloVaiheJulkaisu;
  [hyvaksymisPaatosVaiheJulkaisuPrefix]: HyvaksymisPaatosVaiheJulkaisu;
  [jatkopaatos1VaiheJulkaisuPrefix]: JatkoPaatos1VaiheJulkaisu;
  [jatkopaatos2VaiheJulkaisuPrefix]: JatkoPaatos2VaiheJulkaisu;
}

export type JulkaisuByPrefix<P extends keyof JulkaisuTypeMap> = JulkaisuTypeMap[P];
