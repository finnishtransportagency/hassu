import * as API from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../../user";
import muutaMuokattavanHyvaksymisEsityksenTilaa from "../dynamoDBCalls/muutaTilaa";
import haeProjektinTiedotHyvaksymisEsityksesta, { HyvaksymisEsityksenTiedot } from "../dynamoDBCalls/getHyvaksymisEsityksenTiedot";

/**
 * Asettaa muokattavan hyväksymisesityksen muokkaus-tilaan
 *
 * @param input input
 * @param input.oid Projektin oid
 * @param input.versio Projektin oletettu versio
 * @returns annettu oid
 */
export default async function avaaHyvaksymisEsityksenMuokkaus(input: API.TilaMuutosInput): Promise<string> {
  requirePermissionLuku();
  const { oid, versio } = input;
  console.log("versio", versio);
  const projektiInDB = await haeProjektinTiedotHyvaksymisEsityksesta(oid);
  validate(projektiInDB);
  // Aseta muokattavan hyväksymisesityksen tila
  console.log("projektiInDB versio", projektiInDB.versio);
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
  if (projektiInDB.hyvaksymisPaatosVaihe) {
    throw new IllegalArgumentError("Projekti on jo hyväksymisvaiheessa, joten et voi avata hyväksymiseistyksen muokkausta.");
  }
}
