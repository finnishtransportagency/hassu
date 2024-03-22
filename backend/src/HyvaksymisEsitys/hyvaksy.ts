import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti, JulkaistuHyvaksymisEsitys } from "../database/model";
import { requireOmistaja } from "../user/userService";
import { IllegalArgumentError } from "hassu-common/error";
import { ProjektiPaths } from "../files/ProjektiPath";
import { fileService } from "../files/fileService";
import { config } from "../config";
import { omit } from "lodash";
import { nyt } from "../util/dateUtil";
import { projektiDatabase } from "../database/projektiDatabase";

export async function hyvaksy(
  teeHyvaksymisEsitysToimintoInput: API.TeeHyvaksymisEsitysToimintoInput,
  projektiInDB: DBProjekti
): Promise<string> {
  const nykyinenKayttaja = validate(projektiInDB);
  // Kopioi muokattavan hyväksymisesityksen tiedostot julkaistun hyväksymisesityksen tiedostojen sijaintiin
  const muokattavaHyvaksymisEsitysPath = new ProjektiPaths(teeHyvaksymisEsitysToimintoInput.oid).muokattavaHyvaksymisEsitys();
  const julkaistuHyvaksymisEsitysPath = new ProjektiPaths(teeHyvaksymisEsitysToimintoInput.oid).julkaistuHyvaksymisEsitys();
  await fileService.copyYllapitoFolder(muokattavaHyvaksymisEsitysPath, julkaistuHyvaksymisEsitysPath);
  // Poista muokattavaHyvaksymisEsitys s3:n sisältö.
  const path = new ProjektiPaths(teeHyvaksymisEsitysToimintoInput.oid).muokattavaHyvaksymisEsitys().yllapitoFullPath;
  await fileService.deleteFilesRecursively(config.yllapitoBucketName, path);

  //laita muokattavaHyvaksymisEsitys julkaistuHyvaksymisEsitys-kenttään. Tila ei tule mukaan. Julkaistupäivä ja hyväksyjätieto tulee.
  const julkaistuHyvaksymisEsitys: JulkaistuHyvaksymisEsitys = {
    ...omit(projektiInDB.muokattavaHyvaksymisEsitys, ["tila"]),
    hyvaksymisPaiva: nyt().format(),
    hyvaksyja: nykyinenKayttaja.uid,
  };
  const { oid, versio } = teeHyvaksymisEsitysToimintoInput;
  await projektiDatabase.saveProjekti({ oid, versio, julkaistuHyvaksymisEsitys });
  return teeHyvaksymisEsitysToimintoInput.oid;
}

function validate(projektiInDB: DBProjekti): API.NykyinenKayttaja {
  // Toiminnon tekijän on oltava projektipäällikkö TODO varmista
  const nykyinenKayttaja = requireOmistaja(projektiInDB, "Hyväksymisesityksen voi hyväksyä vain projektipäällikkö");
  // Projektilla on oltava hyväksymistä odottava hyväksymisesitys
  if (projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA) {
    throw new IllegalArgumentError("Projektilla ei ole hyväksymistä odottavaa hyväksymisesitystä");
  }
  return nykyinenKayttaja;
}
