import { DBProjekti, SuunnitteluVaihe } from "../../database/model";
import * as API from "../../../../common/graphql/apiModel";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import { adaptHankkeenKuvaus } from "../commonAdapterUtil/adaptHankkeenKuvaus";
import { findPublishedAloitusKuulutusJulkaisu } from "../commonAdapterUtil/util";

export function adaptSuunnitteluVaiheToSave(
  dbProjekti: DBProjekti,
  suunnitteluVaihe: API.SuunnitteluVaiheInput
): SuunnitteluVaihe {
  function validateSuunnitteluVaihePublishing() {
    const isSuunnitteluVaiheBeingPublished = !dbProjekti.suunnitteluVaihe?.julkinen && suunnitteluVaihe.julkinen;
    if (isSuunnitteluVaiheBeingPublished) {
      // Publishing is allowed only if there is a published aloituskuulutusjulkaisu
      if (!findPublishedAloitusKuulutusJulkaisu(dbProjekti.aloitusKuulutusJulkaisut)) {
        throw new IllegalArgumentError("Suunnitteluvaihetta ei voi julkaista ennen kuin aloituskuulutus on julkaistu");
      }
    }
  }

  if (
    suunnitteluVaihe &&
    (suunnitteluVaihe.arvioSeuraavanVaiheenAlkamisesta ||
      suunnitteluVaihe.hankkeenKuvaus ||
      suunnitteluVaihe.suunnittelunEteneminenJaKesto)
  ) {
    validateSuunnitteluVaihePublishing();

    const {
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      hankkeenKuvaus,
      julkinen,
      palautteidenVastaanottajat,
    } = suunnitteluVaihe;
    return {
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      hankkeenKuvaus: hankkeenKuvaus ? adaptHankkeenKuvaus(hankkeenKuvaus) : undefined,
      julkinen,
      palautteidenVastaanottajat,
    };
  }
  return undefined;
}
