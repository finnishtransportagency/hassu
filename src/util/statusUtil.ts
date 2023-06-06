import {KuulutusJulkaisuTila, Projekti, Status, VuorovaikutusKierrosTila} from "@services/api";
import {ProjektiLisatiedolla} from "src/hooks/useProjekti";

export function projektiOnEpaaktiivinen(projekti: Projekti | ProjektiLisatiedolla | null | undefined): boolean {
  if (!projekti) return true;
  return [Status.EPAAKTIIVINEN_1, Status.EPAAKTIIVINEN_2, Status.EPAAKTIIVINEN_3].includes(projekti.status as Status);
}

export function projektillaOnMigroituJulkaisu(projekti: Projekti | ProjektiLisatiedolla | null | undefined): boolean {
  if (!projekti) return false;
  return (
    projekti.aloitusKuulutusJulkaisu?.tila == KuulutusJulkaisuTila.MIGROITU ||
    projekti.vuorovaikutusKierrosJulkaisut?.some((j) => j.tila == VuorovaikutusKierrosTila.MIGROITU) ||
    projekti.nahtavillaoloVaiheJulkaisu?.tila == KuulutusJulkaisuTila.MIGROITU ||
    projekti.hyvaksymisPaatosVaiheJulkaisu?.tila == KuulutusJulkaisuTila.MIGROITU ||
    projekti.jatkoPaatos1VaiheJulkaisu?.tila == KuulutusJulkaisuTila.MIGROITU ||
    projekti.jatkoPaatos2VaiheJulkaisu?.tila == KuulutusJulkaisuTila.MIGROITU
  );
}
