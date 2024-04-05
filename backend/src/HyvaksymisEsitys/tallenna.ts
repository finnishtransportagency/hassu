import * as API from "hassu-common/graphql/apiModel";
import { auditLog } from "../logger";
import { DBProjekti } from "../database/model";
import { requirePermissionMuokkaa } from "../user";
import { IllegalArgumentError } from "hassu-common/error";
import { adaptHyvaksymisEsitysToSave } from "./adaptHyvaksymisEsitysToSave";
import { varmistaLukuoikeusJaHaeProjekti } from "./util";
import { tallennaMuokattavaHyvaksymisEsitys } from "./dynamoDBCalls";

export async function tallennaHyvaksymisEsitys(input: API.TallennaHyvaksymisEsitysInput): Promise<string> {
  const { oid, versio } = input;
  const { projektiInDB } = await varmistaLukuoikeusJaHaeProjekti(oid);
  validate(projektiInDB);
  // Adaptoi ja tallenna adaptaation tulos tietokantaan
  const projektiAdaptationResult = adaptHyvaksymisEsitysToSave(projektiInDB, input);
  auditLog.info("Tallenna hyväksymisesitys", { input });
  await tallennaMuokattavaHyvaksymisEsitys({
    oid,
    versio,
    muokattavaHyvaksymisEsitys: projektiAdaptationResult.projekti.muokattavaHyvaksymisEsitys!,
  });
  // TODO: reagoi mahdollisiin tiedostomuutoksiin
  return oid;
}

function validate(projektiInDB: DBProjekti) {
  // Toiminnon tekijän on oltava projektihenkilö
  requirePermissionMuokkaa(projektiInDB);
  // Projektilla on oltava muokkaustilainen hyväksymisesitys tai
  // ei muokattavaa hyväksymisesitystä
  if (projektiInDB.muokattavaHyvaksymisEsitys && projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.MUOKKAUS) {
    throw new IllegalArgumentError("Projektilla tulee olla muokkaustilainen hyväksymisesitys tai ei vielä lainkaan hyväksymisesitystä");
  }
}
