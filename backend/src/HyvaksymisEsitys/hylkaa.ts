import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti, MuokattavaHyvaksymisEsitys } from "../database/model";
import { IllegalArgumentError } from "hassu-common/error";
import { requireOmistaja } from "../user/userService";
import { projektiDatabase } from "../database/projektiDatabase";

export async function hylkaa(
  teeHyvaksymisEsitysToimintoInput: API.TeeHyvaksymisEsitysToimintoInput,
  projektiInDB: DBProjekti
): Promise<string> {
  validate(projektiInDB, teeHyvaksymisEsitysToimintoInput);
  const { oid, versio, syy } = teeHyvaksymisEsitysToimintoInput;
  // Päivitä muokattavaHyvaksymisEsityksen tila palautetuksi ja päivitä hylkäyssyy
  const muokattavaHyvaksymisEsitys: MuokattavaHyvaksymisEsitys = {
    ...projektiInDB.muokattavaHyvaksymisEsitys!,
    tila: API.HyvaksymisTila.MUOKKAUS,
    palautusSyy: syy,
  };
  await projektiDatabase.saveProjekti({ oid, versio, muokattavaHyvaksymisEsitys });
  // TODO: korvaa ylläoleva spesifillä tallennustoiminnolla, jossa tallennetaan vain kentät tila ja palaustussyy
  return teeHyvaksymisEsitysToimintoInput.oid;
}

function validate(projektiInDB: DBProjekti, teeHyvaksymisEsitysToimintoInput: API.TeeHyvaksymisEsitysToimintoInput) {
  // Toiminnon tekijän on oltava projektipäällikkö TODO varmista
  requireOmistaja(projektiInDB, "Hyväksymisesityksen hylkäämisen voi tehdä vain projektipäällikkö");
  // Projektilla on oltava hyväksyntää odottava hyväksymisesitys
  if (projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA) {
    throw new IllegalArgumentError("Projektilla ei ole hyväkymistä odottavaa hyväksymisesitystä");
  }
  if (!teeHyvaksymisEsitysToimintoInput.syy) {
    throw new IllegalArgumentError("Hylkäämissyy tulee antaa");
  }
}
