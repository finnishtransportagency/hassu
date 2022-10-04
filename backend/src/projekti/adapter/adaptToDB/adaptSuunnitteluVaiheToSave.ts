import { DBProjekti, SuunnitteluVaihe } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { IllegalArgumentError } from "../../../error/IllegalArgumentError";
import { adaptHankkeenKuvausToSave, findPublishedAloitusKuulutusJulkaisu } from "../common";

export function adaptSuunnitteluVaiheToSave(
  dbProjekti: DBProjekti,
  suunnitteluVaihe: API.SuunnitteluVaiheInput | undefined | null
): SuunnitteluVaihe | undefined {
  if (
    suunnitteluVaihe &&
    (suunnitteluVaihe.arvioSeuraavanVaiheenAlkamisesta || suunnitteluVaihe.hankkeenKuvaus || suunnitteluVaihe.suunnittelunEteneminenJaKesto)
  ) {
    validateSuunnitteluVaihePublishing(dbProjekti, suunnitteluVaihe);

    const { arvioSeuraavanVaiheenAlkamisesta, suunnittelunEteneminenJaKesto, hankkeenKuvaus, julkinen, palautteidenVastaanottajat } =
      suunnitteluVaihe;
    if (!hankkeenKuvaus) {
      throw new IllegalArgumentError("Suunnitteluvaiheella on oltava hankkeenKuvaus!");
    }
    return {
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      hankkeenKuvaus: hankkeenKuvaus ? adaptHankkeenKuvausToSave(hankkeenKuvaus) : undefined,
      julkinen,
      palautteidenVastaanottajat,
    };
  }
  return undefined;
}

function validateSuunnitteluVaihePublishing(dbProjekti: DBProjekti, suunnitteluVaihe: API.SuunnitteluVaiheInput) {
  const isSuunnitteluVaiheBeingPublished = !dbProjekti.suunnitteluVaihe?.julkinen && suunnitteluVaihe.julkinen;
  if (isSuunnitteluVaiheBeingPublished) {
    // Publishing is allowed only if there is a published aloituskuulutusjulkaisu
    if (!(dbProjekti.aloitusKuulutusJulkaisut && findPublishedAloitusKuulutusJulkaisu(dbProjekti.aloitusKuulutusJulkaisut))) {
      throw new IllegalArgumentError("Suunnitteluvaihetta ei voi julkaista ennen kuin aloituskuulutus on julkaistu");
    }
  }
}
