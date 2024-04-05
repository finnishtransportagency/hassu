import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti, JulkaistuHyvaksymisEsitys } from "../database/model";
import { requireOmistaja } from "../user/userService";
import { IllegalArgumentError } from "hassu-common/error";
import { ProjektiPaths } from "../files/ProjektiPath";
import { fileService } from "../files/fileService";
import { config } from "../config";
import { varmistaLukuoikeusJaHaeProjekti } from "./util";
import { omit } from "lodash";
import { nyt } from "../util/dateUtil";
import { tallennaJulkaistuHyvaksymisEsitysJaAsetaTilaHyvaksytyksi } from "./dynamoDBCalls";

export async function hyvaksyHyvaksymisEsitys(input: API.TilaMuutosInput): Promise<string> {
  const { oid, versio } = input;
  const { projektiInDB, nykyinenKayttaja } = await varmistaLukuoikeusJaHaeProjekti(oid);
  validate(projektiInDB);
  // Poista julkaistun hyväksymisesityksen nykyiset tiedostot
  const path = new ProjektiPaths(oid).julkaistuHyvaksymisEsitys().yllapitoFullPath;
  await fileService.deleteFilesRecursively(config.yllapitoBucketName, path);
  // Kopioi muokattavan hyväksymisesityksen tiedostot julkaistun hyväksymisesityksen tiedostojen sijaintiin
  const muokattavaHyvaksymisEsitysPath = new ProjektiPaths(oid).muokattavaHyvaksymisEsitys();
  const julkaistuHyvaksymisEsitysPath = new ProjektiPaths(oid).julkaistuHyvaksymisEsitys();
  await fileService.copyYllapitoFolder(muokattavaHyvaksymisEsitysPath, julkaistuHyvaksymisEsitysPath);

  // Kopioi muokattavaHyvaksymisEsitys julkaistuHyvaksymisEsitys-kenttään. Tila ei tule mukaan. Julkaistupäivä ja hyväksyjätieto tulee.
  const julkaistuHyvaksymisEsitys: JulkaistuHyvaksymisEsitys = {
    ...omit(projektiInDB.muokattavaHyvaksymisEsitys, ["tila"]),
    hyvaksymisPaiva: nyt().format(),
    hyvaksyja: nykyinenKayttaja.uid,
  };
  await tallennaJulkaistuHyvaksymisEsitysJaAsetaTilaHyvaksytyksi({ oid, versio, julkaistuHyvaksymisEsitys });
  return oid;
}

function validate(projektiInDB: DBProjekti): API.NykyinenKayttaja {
  // Toiminnon tekijän on oltava projektipäällikkö
  const nykyinenKayttaja = requireOmistaja(projektiInDB, "Hyväksymisesityksen voi hyväksyä vain projektipäällikkö");
  // Projektilla on oltava hyväksymistä odottava hyväksymisesitys
  if (projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA) {
    throw new IllegalArgumentError("Projektilla ei ole hyväksymistä odottavaa hyväksymisesitystä");
  }
  return nykyinenKayttaja;
}
