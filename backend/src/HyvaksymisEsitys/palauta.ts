import * as API from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { requireOmistaja, requirePermissionLuku } from "../user/userService";
import { palautaHyvaksymisEsityksenTilaMuokkaukseksiJaAsetaSyy } from "./dynamoDBCalls";
import haeProjektinTiedotHyvaksymisEsityksesta, { HyvaksymisEsityksenTiedot } from "./dynamoDBCalls/get";

export async function palautaHyvaksymisEsitys(input: API.PalautaInput): Promise<string> {
  requirePermissionLuku();
  const { oid, versio, syy } = input;
  const projektiInDB = await haeProjektinTiedotHyvaksymisEsityksesta(oid);
  validate(projektiInDB);
  // Päivitä muokattavaHyvaksymisEsityksen tila palautetuksi ja päivitä hylkäyssyy
  await palautaHyvaksymisEsityksenTilaMuokkaukseksiJaAsetaSyy({ oid, versio, syy });
  return oid;
}

function validate(projektiInDB: HyvaksymisEsityksenTiedot) {
  // Toiminnon tekijän on oltava projektipäällikkö
  requireOmistaja(projektiInDB, "Hyväksymisesityksen palauttamisen voi tehdä vain projektipäällikkö");
  // Projektilla on oltava hyväksyntää odottava hyväksymisesitys
  if (projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA) {
    throw new IllegalArgumentError("Projektilla ei ole hyväksymistä odottavaa hyväksymisesitystä");
  }
}
