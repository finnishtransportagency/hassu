import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../database/model";
import { IllegalArgumentError } from "hassu-common/error";
import { requireOmistaja } from "../user/userService";
import { ProjektiPaths } from "../files/ProjektiPath";
import { fileService } from "../files/fileService";
import { projektiDatabase } from "../database/projektiDatabase";
import { omit } from "lodash";

export async function avaaMuokkaus(
  teeHyvaksymisEsitysToimintoInput: API.TeeHyvaksymisEsitysToimintoInput,
  projektiInDB: DBProjekti
): Promise<string> {
  validate(projektiInDB);
  // Kopioi julkaistun hyväksymisesityksen tiedostot muokattavan hyväksymisesityksen tiedostojen sijaintiin
  const muokattavaHyvaksymisEsitysPath = new ProjektiPaths(teeHyvaksymisEsitysToimintoInput.oid).muokattavaHyvaksymisEsitys();
  const julkaistuHyvaksymisEsitysPath = new ProjektiPaths(teeHyvaksymisEsitysToimintoInput.oid).julkaistuHyvaksymisEsitys();
  await fileService.copyYllapitoFolder(julkaistuHyvaksymisEsitysPath, muokattavaHyvaksymisEsitysPath);
  // Kopioi julkaisusta jutut muokattavaHyvaksymisEsitykseen ja aseta oikea tila
  // – tiedostojen polkuja ei tarvitse päivittää
  const muokattavaHyvaksymisEsitys = {
    ...omit(projektiInDB.julkaistuHyvaksymisEsitys, ["hyvaksyja", "hyvaksymisPaiva", "aineistopaketti"]),
    tila: API.HyvaksymisTila.MUOKKAUS,
  };
  const { oid, versio } = teeHyvaksymisEsitysToimintoInput;
  await projektiDatabase.saveProjekti({ oid, versio, muokattavaHyvaksymisEsitys });
  return teeHyvaksymisEsitysToimintoInput.oid;
}

function validate(projektiInDB: DBProjekti) {
  // Toiminnon tekijän on oltava projektipäällikkö TODO varmista
  requireOmistaja(projektiInDB, "Hyväksymisesityksen muokkauksen voi avata vain projektipäällikkö");
  // Projektilla on oltava julkaistu hyväksymisesitys
  if (!projektiInDB.julkaistuHyvaksymisEsitys) {
    throw new IllegalArgumentError("Projektilla ei ole julkaistua hyväksymisesitystä");
  }
  // Projektilla ei saa olla ennestään muokkaus auki
  if (projektiInDB.muokattavaHyvaksymisEsitys) {
    throw new IllegalArgumentError("Projektilla on jo muokkaus auki tai hyväksyntää odottava hyväksymisesitys");
  }
}
