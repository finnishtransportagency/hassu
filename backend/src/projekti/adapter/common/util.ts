import { AloitusKuulutusJulkaisu } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";

export function findPublishedAloitusKuulutusJulkaisu(
  aloitusKuulutusJulkaisut: AloitusKuulutusJulkaisu[]
): AloitusKuulutusJulkaisu | undefined {
  return (
    findJulkaisuByStatus(aloitusKuulutusJulkaisut, API.AloitusKuulutusTila.HYVAKSYTTY) ||
    findJulkaisuByStatus(aloitusKuulutusJulkaisut, API.AloitusKuulutusTila.MIGROITU)
  );
}

export function findJulkaisuByStatus<T extends { tila?: API.AloitusKuulutusTila }>(
  aloitusKuulutusJulkaisut: T[],
  tila: API.AloitusKuulutusTila
): T | undefined {
  return aloitusKuulutusJulkaisut?.filter((j) => j.tila == tila).pop();
}
