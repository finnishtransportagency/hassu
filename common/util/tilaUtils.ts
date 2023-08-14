import { DBProjekti } from "../../backend/src/database/model";
import { KuulutusJulkaisuTila, Projekti, VuorovaikutusKierrosTila } from "../graphql/apiModel";

export function viimeisinTilaOnMigraatio(projekti: DBProjekti | Projekti): boolean {
  if (isProjektiDBProjekti(projekti)) {
    return viimeisinTilaOnMigraatioDB(projekti);
  } else if (isProjektiAPIProjekti(projekti)) {
    return viimeisinTilaOnMigraatioAPI(projekti);
  } else {
    return true; // Projekti does not have aloitusKuulutusJulkaisu nor aloitusKuulutusJulkaisut
  }
}

function isProjektiDBProjekti(projekti: DBProjekti | Projekti): projekti is DBProjekti {
  return !!(projekti as DBProjekti).aloitusKuulutusJulkaisut; // Does not actually tell if projekti is DBProjekti, but is enough for our use case
}
function isProjektiAPIProjekti(projekti: DBProjekti | Projekti): projekti is Projekti {
  return !!(projekti as Projekti).aloitusKuulutusJulkaisu; // Does not actually tell if projekti is Projekti, but is enough for our use case
}

function viimeisinTilaOnMigraatioDB(projekti: DBProjekti) {
  if (projekti.aloitusKuulutusJulkaisut?.some((julkaisu) => julkaisu.tila !== KuulutusJulkaisuTila.MIGROITU)) {
    return false;
  } else if (projekti.vuorovaikutusKierrosJulkaisut?.some((julkaisu) => julkaisu.tila !== VuorovaikutusKierrosTila.MIGROITU)) {
    return false;
  } else if (projekti.nahtavillaoloVaiheJulkaisut?.some((julkaisu) => julkaisu.tila !== KuulutusJulkaisuTila.MIGROITU)) {
    return false;
  } else if (projekti.hyvaksymisPaatosVaiheJulkaisut?.some((julkaisu) => julkaisu.tila !== KuulutusJulkaisuTila.MIGROITU)) {
    return false;
  } else if (projekti.jatkoPaatos1VaiheJulkaisut?.some((julkaisu) => julkaisu.tila !== KuulutusJulkaisuTila.MIGROITU)) {
    return false;
  } else if (projekti.jatkoPaatos2VaiheJulkaisut?.some((julkaisu) => julkaisu.tila !== KuulutusJulkaisuTila.MIGROITU)) {
    return false;
  } else {
    return true;
  }
}

function viimeisinTilaOnMigraatioAPI(projekti: Projekti) {
  if (projekti.aloitusKuulutusJulkaisu?.tila !== KuulutusJulkaisuTila.MIGROITU) {
    return false;
  } else if (projekti.vuorovaikutusKierrosJulkaisut?.some((julkaisu) => julkaisu.tila !== VuorovaikutusKierrosTila.MIGROITU)) {
    return false;
  } else if (projekti.nahtavillaoloVaiheJulkaisu?.tila !== KuulutusJulkaisuTila.MIGROITU) {
    return false;
  } else if (projekti.hyvaksymisPaatosVaiheJulkaisu?.tila !== KuulutusJulkaisuTila.MIGROITU) {
    return false;
  } else if (projekti.jatkoPaatos1VaiheJulkaisu?.tila !== KuulutusJulkaisuTila.MIGROITU) {
    return false;
  } else if (projekti.jatkoPaatos2VaiheJulkaisu?.tila !== KuulutusJulkaisuTila.MIGROITU) {
    return false;
  } else {
    return true;
  }
}
