import * as API from "hassu-common/graphql/apiModel";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../user/userService";
import { IllegalArgumentError } from "hassu-common/error";
import { fileService } from "../files/fileService";
import { ProjektiPaths } from "../files/ProjektiPath";
import { config } from "../config";
import { omit } from "lodash";
import { tallennaMuokattavaHyvaksymisEsitys } from "./dynamoDBCalls";
import haeProjektinTiedotHyvaksymisEsityksesta, { HyvaksymisEsityksenTiedot } from "./dynamoDBCalls/get";

export default async function suljeHyvaksymisEsityksenMuokkaus(input: API.TilaMuutosInput): Promise<string> {
  requirePermissionLuku();
  const { oid, versio } = input;
  const projektiInDB = await haeProjektinTiedotHyvaksymisEsityksesta(oid);
  validate(projektiInDB);
  // Poista muokattavissa olevan hyväksymisesityksen tiedostot
  const path = new ProjektiPaths(oid).muokattavaHyvaksymisEsitys().yllapitoFullPath;
  await fileService.deleteFilesRecursively(config.yllapitoBucketName, path);
  // Kopioi julkaistun hyväksymisesityksen tiedostot muokattavan hyväksymisesityksen tiedostojen sijaintiin
  const muokattavaHyvaksymisEsitysPath = new ProjektiPaths(oid).muokattavaHyvaksymisEsitys();
  const julkaistuHyvaksymisEsitysPath = new ProjektiPaths(oid).julkaistuHyvaksymisEsitys();
  await fileService.copyYllapitoFolder(julkaistuHyvaksymisEsitysPath, muokattavaHyvaksymisEsitysPath);
  // Kopioi julkaisusta jutut muokattavaHyvaksymisEsitykseen ja aseta tila hyväksytyksi
  // – tiedostojen polkuja ei tarvitse päivittää
  const muokattavaHyvaksymisEsitys = {
    ...omit(projektiInDB.julkaistuHyvaksymisEsitys, ["hyvaksyja", "hyvaksymisPaiva", "aineistopaketti"]),
    tila: API.HyvaksymisTila.HYVAKSYTTY,
  };
  await tallennaMuokattavaHyvaksymisEsitys({ oid, versio, muokattavaHyvaksymisEsitys });
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
