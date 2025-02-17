import * as API from "hassu-common/graphql/apiModel";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../../user/userService";
import { IllegalArgumentError } from "hassu-common/error";
import { omit } from "lodash";
import { JulkaistuHyvaksymisEsitys, MuokattavaHyvaksymisEsitys } from "../../database/model";
import { getHyvaksymisEsityksenLadatutTiedostot } from "../getLadatutTiedostot";
import getHyvaksymisEsityksenAineistot from "../getAineistot";
import { deleteFilesUnderSpecifiedVaihe } from "../s3Calls/deleteFiles";
import { JULKAISTU_HYVAKSYMISESITYS_PATH, MUOKATTAVA_HYVAKSYMISESITYS_PATH } from "../../tiedostot/paths";
import { copyFilesFromVaiheToAnother } from "../s3Calls/copyFiles";
import { assertIsDefined } from "../../util/assertions";
import projektiDatabase, { HyvaksymisEsityksenTiedot } from "../dynamoKutsut";

export default async function suljeHyvaksymisEsityksenMuokkaus(input: API.TilaMuutosInput): Promise<string> {
  const kayttaja = requirePermissionLuku();
  const { oid, versio } = input;
  const projektiInDB = await projektiDatabase.haeProjektinTiedotHyvaksymisEsityksesta(oid);
  validate(projektiInDB);
  // Poista muokattavissa olevan hyväksymisesityksen tiedostot
  await poistaMuokattavanHyvaksymisEsityksenTiedostot(oid, projektiInDB.muokattavaHyvaksymisEsitys);
  // Kopioi julkaistun hyväksymisesityksen tiedostot muokattavan hyväksymisesityksen tiedostojen sijaintiin
  assertIsDefined(projektiInDB.julkaistuHyvaksymisEsitys, "julkaistun hyväksymisesityksen olemassaolo on validoitu");
  await copyJulkaistunHyvaksymisEsitysFilesToMuokattava(oid, projektiInDB.julkaistuHyvaksymisEsitys);
  // Kopioi julkaisusta jutut muokattavaHyvaksymisEsitykseen ja aseta tila hyväksytyksi
  // – tiedostojen polkuja ei tarvitse päivittää.
  // Tiputa vastaanottajista pois sähköpostin lähetystiedot.
  const muokattavaHyvaksymisEsitys = {
    ...omit(projektiInDB.julkaistuHyvaksymisEsitys, ["hyvaksyja", "hyvaksymisPaiva", "vastaanottajat", "asianhallintaId"]),
    tila: API.HyvaksymisTila.HYVAKSYTTY,
    versio: projektiInDB.julkaistuHyvaksymisEsitys.versio,
    vastaanottajat: projektiInDB.julkaistuHyvaksymisEsitys.vastaanottajat?.map((vo) => ({
      sahkoposti: vo.sahkoposti,
    })),
  };
  assertIsDefined(kayttaja.uid, "Kayttaja.uid oltava määritelty");
  await projektiDatabase.tallennaMuokattavaHyvaksymisEsitys({ oid, versio, muokattavaHyvaksymisEsitys, muokkaaja: kayttaja.uid });
  return oid;
}

function validate(projektiInDB: HyvaksymisEsityksenTiedot) {
  // Toiminnon tekijän on oltava projektikäyttäjä
  requirePermissionMuokkaa(projektiInDB);
  // Projektilla on oltava muokkaustilainen hyväksymisesitys
  if (projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.MUOKKAUS) {
    throw new IllegalArgumentError("Projektilla ei ole muokkaustilaista hyväksymisesitystä");
  }
  // Projektilla on oltava julkaistu hyväksymisesitys
  if (!projektiInDB.julkaistuHyvaksymisEsitys) {
    throw new IllegalArgumentError("Projektilla ei ole julkaistua hyväksymisesitystä");
  }
}

async function poistaMuokattavanHyvaksymisEsityksenTiedostot(
  oid: string,
  muokattavaHyvaksymisEsitys: MuokattavaHyvaksymisEsitys | undefined | null
) {
  if (!muokattavaHyvaksymisEsitys) {
    return;
  }
  const tiedostot = getHyvaksymisEsityksenLadatutTiedostot(muokattavaHyvaksymisEsitys);
  const aineistot = getHyvaksymisEsityksenAineistot(muokattavaHyvaksymisEsitys);
  await deleteFilesUnderSpecifiedVaihe(
    oid,
    MUOKATTAVA_HYVAKSYMISESITYS_PATH,
    [...tiedostot, ...aineistot],
    "hyväksymisesityksen muokkaus suljetaan"
  );
}

async function copyJulkaistunHyvaksymisEsitysFilesToMuokattava(oid: string, julkaistuHyvaksymisEsitys: JulkaistuHyvaksymisEsitys) {
  const tiedostot = getHyvaksymisEsityksenLadatutTiedostot(julkaistuHyvaksymisEsitys);
  const aineistot = getHyvaksymisEsityksenAineistot(julkaistuHyvaksymisEsitys);
  await copyFilesFromVaiheToAnother(oid, JULKAISTU_HYVAKSYMISESITYS_PATH, MUOKATTAVA_HYVAKSYMISESITYS_PATH, [...tiedostot, ...aineistot]);
}
