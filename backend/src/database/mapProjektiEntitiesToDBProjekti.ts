import { groupProjektiEntitiesByType } from "./groupProjektiEntitiesByType";
import { AnyKuulutusJulkaisu, DBProjekti, DBProjektiSlim } from "./model";

export function mapProjektiEntitiesToDBProjekti(slimProjekti: DBProjektiSlim, entities: AnyKuulutusJulkaisu[]): DBProjekti {
  const grouped = groupProjektiEntitiesByType(entities);
  const projekti: DBProjekti = {
    ...slimProjekti,
    aloitusKuulutusJulkaisut: grouped.aloitusKuulutusJulkaisut,
    nahtavillaoloVaiheJulkaisut: grouped.nahtavillaoloVaiheJulkaisut,
    hyvaksymisPaatosVaiheJulkaisut: grouped.hyvaksymisPaatosVaiheJulkaisut,
    jatkoPaatos1VaiheJulkaisut: grouped.jatkoPaatos1VaiheJulkaisut,
    jatkoPaatos2VaiheJulkaisut: grouped.jatkoPaatos2VaiheJulkaisut,
    tallennettu: true,
  };
  return projekti;
}
