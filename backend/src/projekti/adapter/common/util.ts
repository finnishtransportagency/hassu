import { AloitusKuulutusJulkaisu } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { findJulkaisuWithTila } from "../../projektiUtil";

export function findPublishedAloitusKuulutusJulkaisu(
  aloitusKuulutusJulkaisut: AloitusKuulutusJulkaisu[]
): AloitusKuulutusJulkaisu | undefined {
  return (
    findJulkaisuWithTila(aloitusKuulutusJulkaisut, API.AloitusKuulutusTila.HYVAKSYTTY) ||
    findJulkaisuWithTila(aloitusKuulutusJulkaisut, API.AloitusKuulutusTila.MIGROITU)
  );
}
