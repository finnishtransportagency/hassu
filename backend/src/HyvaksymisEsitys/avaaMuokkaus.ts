import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../database/model";
import { IllegalArgumentError } from "hassu-common/error";
import { projektiDatabase } from "../database/projektiDatabase";
import { assertIsDefined } from "../util/assertions";
import { requirePermissionMuokkaa } from "../user";
import { varmistaLukuoikeusJaHaeProjekti } from "./util";

export async function avaaHyvaksymisEsityksenMuokkaus(input: API.TilaMuutosInput): Promise<string> {
  const { oid, versio } = input;
  const projektiInDB = await varmistaLukuoikeusJaHaeProjekti(oid);
  validate(projektiInDB);
  // Aseta muokattavan hyväksymisesityksen tila
  assertIsDefined(projektiInDB.muokattavaHyvaksymisEsitys, "muokattavaHyvaksymisEsitys on oltava olemassa");
  const muokattavaHyvaksymisEsitys = {
    ...projektiInDB.muokattavaHyvaksymisEsitys,
    tila: API.HyvaksymisTila.MUOKKAUS,
  };
  await projektiDatabase.saveProjekti({ oid, versio, muokattavaHyvaksymisEsitys });
  // TODO: korvaa ylläoleva spesifillä tallennustoiminnolla, jossa tallennetaan vain tila-kenttä
  return oid;
}

function validate(projektiInDB: DBProjekti) {
  // Toiminnon tekijän on oltava projektikäyttäjä
  requirePermissionMuokkaa(projektiInDB);
  // Projektilla on oltava julkaistu hyväksymisesitys
  if (!projektiInDB.julkaistuHyvaksymisEsitys) {
    throw new IllegalArgumentError("Projektilla ei ole julkaistua hyväksymisesitystä");
  }
  // Projektin tulee olla lukutilassa, jotta muokkauksen voi avata
  if (projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.HYVAKSYTTY) {
    throw new IllegalArgumentError("Projektin tulee olla lukutilassa, jotta muokkauksen voi avata.");
  }
}
