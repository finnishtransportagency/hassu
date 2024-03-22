import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti, MuokattavaHyvaksymisEsitys } from "../database/model";
import { requirePermissionMuokkaa } from "../user";
import { IllegalArgumentError } from "hassu-common/error";
import { projektiDatabase } from "../database/projektiDatabase";

export async function lahetaHyvaksyttavaksi(
  teeHyvaksymisEsitysToimintoInput: API.TeeHyvaksymisEsitysToimintoInput,
  projektiInDB: DBProjekti
): Promise<string> {
  validate(projektiInDB);
  // Päivitä muokattavaHyvaksymisEsityksen tila palautetuksi ja päivitä hylkäyssyy
  const { oid, versio } = teeHyvaksymisEsitysToimintoInput;
  const muokattavaHyvaksymisEsitys: MuokattavaHyvaksymisEsitys = {
    ...projektiInDB.muokattavaHyvaksymisEsitys!,
    tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
  };
  await projektiDatabase.saveProjekti({ oid, versio, muokattavaHyvaksymisEsitys });
  // TODO: korvaa ylläoleva spesifillä tallennustoiminnolla, jossa tallennetaan vain tila-kenttä
  return teeHyvaksymisEsitysToimintoInput.oid;
}

function validate(projektiInDB: DBProjekti) {
  // Toiminnon tekijän on oltava projektihenkilö
  requirePermissionMuokkaa(projektiInDB);
  // Projektilla on oltava muokkaustilainen hyväksymisesitys
  if (projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.MUOKKAUS) {
    throw new IllegalArgumentError("Projektilla ei ole muokkaustilaista hyväksymisesitystä");
  }
  // TODO validoi, että kaikki kentät on täytetty
}
