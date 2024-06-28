import * as API from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../../user";
import projektiDatabase, { HyvaksymisEsityksenTiedot } from "../dynamoKutsut";
import { validateVaiheOnAktiivinen } from "../validateVaiheOnAktiivinen";
import { assertIsDefined } from "../../util/assertions";

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
  const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
  assertIsDefined(projektiInDB);
  await validate(projektiInDB);
  // Aseta muokattavan hyväksymisesityksen tila
  await projektiDatabase.muutaMuokattavanHyvaksymisEsityksenTilaa({
    oid,
    versio,
    uusiTila: API.HyvaksymisTila.MUOKKAUS,
    vanhaTila: API.HyvaksymisTila.HYVAKSYTTY,
  });
  return oid;
}

async function validate(projektiInDB: HyvaksymisEsityksenTiedot) {
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
  await validateVaiheOnAktiivinen(projektiInDB);
}
