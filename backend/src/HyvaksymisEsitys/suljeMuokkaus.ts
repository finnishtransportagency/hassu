import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../database/model";
import { requireOmistaja } from "../user/userService";
import { IllegalArgumentError } from "hassu-common/error";
import { fileService } from "../files/fileService";
import { ProjektiPaths } from "../files/ProjektiPath";
import { config } from "../config";
import { projektiDatabase } from "../database/projektiDatabase";

export async function suljeMuokkaus(
  teeHyvaksymisEsitysToimintoInput: API.TeeHyvaksymisEsitysToimintoInput,
  projektiInDB: DBProjekti
): Promise<string> {
  validate(projektiInDB);
  const { oid, versio } = teeHyvaksymisEsitysToimintoInput;
  // Poista muokattavissa oleva hyväksymisesitys
  await projektiDatabase.saveProjekti({ oid, versio, muokattavaHyvaksymisEsitys: null });
  // Poista muokattavissa olevan hyväksymisesityksen tiedostot
  const path = new ProjektiPaths(teeHyvaksymisEsitysToimintoInput.oid).muokattavaHyvaksymisEsitys().yllapitoFullPath;
  await fileService.deleteFilesRecursively(config.yllapitoBucketName, path);
  return teeHyvaksymisEsitysToimintoInput.oid;
}

function validate(projektiInDB: DBProjekti) {
  // Toiminnon tekijän on oltava projektipäällikkö TODO varmista
  requireOmistaja(projektiInDB, "Hyväksymisesityksen muokkauksen voi sulkea vain projektipäällikkö");
  // Projektilla on oltava muokkaustilainen hyväksymisesitys
  if (projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.MUOKKAUS) {
    throw new IllegalArgumentError("Projektilla ei ole muokkaustilaista hyväksymisesitystä");
  }
  // Projektilla on oltava julkaistu hyväksymisesitys
  if (!projektiInDB.julkaistuHyvaksymisEsitys) {
    throw new IllegalArgumentError("Projektilla ei ole julkaistua hyväksymisesitystä");
  }
}
