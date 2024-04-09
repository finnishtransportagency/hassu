import * as API from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../user";
import muutaMuokattavanHyvaksymisEsityksenTilaa from "./dynamoDBCalls/muutaTilaa";
import haeProjektinTiedotHyvaksymisEsityksesta, { HyvaksymisEsityksenTiedot } from "./dynamoDBCalls/get";

export async function avaaHyvaksymisEsityksenMuokkaus(input: API.TilaMuutosInput): Promise<string> {
  requirePermissionLuku();
  const { oid, versio } = input;
  const projektiInDB = await haeProjektinTiedotHyvaksymisEsityksesta(oid);
  validate(projektiInDB);
  // Aseta muokattavan hyväksymisesityksen tila
  await muutaMuokattavanHyvaksymisEsityksenTilaa({
    oid,
    versio,
    uusiTila: API.HyvaksymisTila.MUOKKAUS,
    vanhaTila: API.HyvaksymisTila.HYVAKSYTTY,
  });
  return oid;
}

function validate(projektiInDB: HyvaksymisEsityksenTiedot) {
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
