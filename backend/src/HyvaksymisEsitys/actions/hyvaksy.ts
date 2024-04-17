import * as API from "hassu-common/graphql/apiModel";
import { JulkaistuHyvaksymisEsitys, MuokattavaHyvaksymisEsitys } from "../../database/model";
import { requireOmistaja, requirePermissionLuku } from "../../user/userService";
import { IllegalArgumentError } from "hassu-common/error";
import { omit } from "lodash";
import { nyt } from "../../util/dateUtil";
import { tallennaJulkaistuHyvaksymisEsitysJaAsetaTilaHyvaksytyksi } from "../dynamoDBCalls";
import haeProjektinTiedotHyvaksymisEsityksesta, { HyvaksymisEsityksenTiedot } from "../dynamoDBCalls/getHyvaksymisEsityksenTiedot";
import { getHyvaksymisEsityksenLadatutTiedostot } from "../getLadatutTiedostot";
import getHyvaksymisEsityksenAineistot from "../getAineistot";
import { JULKAISTU_HYVAKSYMISESITYS_PATH, MUOKATTAVA_HYVAKSYMISESITYS_PATH } from "../paths";
import { deleteFilesUnderSpecifiedVaihe } from "../s3Calls/deleteFiles";
import { copyFilesFromVaiheToAnother } from "../s3Calls/copyFiles";
import { assertIsDefined } from "../../util/assertions";

export default async function hyvaksyHyvaksymisEsitys(input: API.TilaMuutosInput): Promise<string> {
  const nykyinenKayttaja = requirePermissionLuku();
  const { oid, versio } = input;
  const projektiInDB = await haeProjektinTiedotHyvaksymisEsityksesta(oid);
  validate(projektiInDB);
  // Poista julkaistun hyväksymisesityksen nykyiset tiedostot
  await poistaJulkaistunHyvaksymisEsityksenTiedostot(oid, projektiInDB.julkaistuHyvaksymisEsitys);
  // Kopioi muokattavan hyväksymisesityksen tiedostot julkaistun hyväksymisesityksen tiedostojen sijaintiin
  assertIsDefined(projektiInDB.muokattavaHyvaksymisEsitys, "muokattavan hyväksymisesityksen olemassaolo on validoitu");
  await copyMuokattavaHyvaksymisEsitysFilesToJulkaistu(oid, projektiInDB.muokattavaHyvaksymisEsitys);

  // Kopioi muokattavaHyvaksymisEsitys julkaistuHyvaksymisEsitys-kenttään. Tila ei tule mukaan. Julkaistupäivä ja hyväksyjätieto tulee.
  const julkaistuHyvaksymisEsitys: JulkaistuHyvaksymisEsitys = {
    ...omit(projektiInDB.muokattavaHyvaksymisEsitys, ["tila", "palautusSyy", "aineistoHandledAt"]),
    hyvaksymisPaiva: nyt().format(),
    hyvaksyja: nykyinenKayttaja.uid,
  };
  await tallennaJulkaistuHyvaksymisEsitysJaAsetaTilaHyvaksytyksi({ oid, versio, julkaistuHyvaksymisEsitys });
  return oid;
}

function validate(projektiInDB: HyvaksymisEsityksenTiedot): API.NykyinenKayttaja {
  // Toiminnon tekijän on oltava projektipäällikkö
  const nykyinenKayttaja = requireOmistaja(projektiInDB, "Hyväksymisesityksen voi hyväksyä vain projektipäällikkö");
  // Projektilla on oltava hyväksymistä odottava hyväksymisesitys
  if (projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA) {
    throw new IllegalArgumentError("Projektilla ei ole hyväksymistä odottavaa hyväksymisesitystä");
  }
  return nykyinenKayttaja;
}

async function poistaJulkaistunHyvaksymisEsityksenTiedostot(
  oid: string,
  julkaistuHyvaksymisEsitys: JulkaistuHyvaksymisEsitys | undefined | null
) {
  if (!julkaistuHyvaksymisEsitys) {
    return;
  }
  const tiedostot = getHyvaksymisEsityksenLadatutTiedostot(julkaistuHyvaksymisEsitys);
  const aineistot = getHyvaksymisEsityksenAineistot(julkaistuHyvaksymisEsitys);
  await deleteFilesUnderSpecifiedVaihe(
    oid,
    JULKAISTU_HYVAKSYMISESITYS_PATH,
    [...tiedostot, ...aineistot],
    "uusi hyväksymisesitys julkaistaan"
  );
}

async function copyMuokattavaHyvaksymisEsitysFilesToJulkaistu(oid: string, muokattavaHyvaksymisEsitys: MuokattavaHyvaksymisEsitys) {
  const tiedostot = getHyvaksymisEsityksenLadatutTiedostot(muokattavaHyvaksymisEsitys);
  const aineistot = getHyvaksymisEsityksenAineistot(muokattavaHyvaksymisEsitys);
  await copyFilesFromVaiheToAnother(oid, MUOKATTAVA_HYVAKSYMISESITYS_PATH, JULKAISTU_HYVAKSYMISESITYS_PATH, [...tiedostot, ...aineistot]);
}
