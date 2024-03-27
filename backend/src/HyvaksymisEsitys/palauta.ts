import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../database/model";
import { IllegalArgumentError } from "hassu-common/error";
import { requireOmistaja } from "../user/userService";
import { varmistaLukuoikeusJaHaeProjekti } from "./util";

export async function palautaHyvaksymisEsitys(input: API.PalautaInput): Promise<string> {
  const { oid } = input;
  const projektiInDB = await varmistaLukuoikeusJaHaeProjekti(oid);
  validate(projektiInDB);
  // Päivitä muokattavaHyvaksymisEsityksen tila palautetuksi ja päivitä hylkäyssyy
  // TODO: aseta muokattavanHyvaksymisEsityksen tila ja palautussyy
  return oid;
}

function validate(projektiInDB: DBProjekti) {
  // Toiminnon tekijän on oltava projektipäällikkö
  requireOmistaja(projektiInDB, "Hyväksymisesityksen palauttamisen voi tehdä vain projektipäällikkö");
  // Projektilla on oltava hyväksyntää odottava hyväksymisesitys
  if (projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA) {
    throw new IllegalArgumentError("Projektilla ei ole hyväksymistä odottavaa hyväksymisesitystä");
  }
}
