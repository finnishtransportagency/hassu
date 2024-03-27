import * as API from "hassu-common/graphql/apiModel";
import { auditLog } from "../logger";
import { DBProjekti } from "../database/model";
import { requirePermissionMuokkaa } from "../user";
import { IllegalArgumentError } from "hassu-common/error";
import { adaptHyvaksymisEsitysToSave } from "./adaptHyvaksymisEsitysToSave";
import { varmistaLukuoikeusJaHaeProjekti } from "./util";

export async function tallennaHyvaksymisEsitys(input: API.TallennaHyvaksymisEsitysInput): Promise<string> {
  const { oid } = input;
  const projektiInDB = await varmistaLukuoikeusJaHaeProjekti(oid);
  await tallennaHyvaksymisEsitysHelper(input, projektiInDB);
  return oid;
}

export async function tallennaHyvaksymisEsitysHelper(
  hyvaksymisEsitysInput: API.TallennaHyvaksymisEsitysInput,
  projektiInDB: DBProjekti
): Promise<DBProjekti> {
  validate(projektiInDB);
  auditLog.info("Tallenna hyväksymisesitys", { hyvaksymisEsitysInput });
  const projektiAdaptationResult = adaptHyvaksymisEsitysToSave(projektiInDB, hyvaksymisEsitysInput);
  // TODO: tallenna hyvaksymisesitys
  // TODO: laita mahdollisia tiedosto-eventtejä sqs-jonoon
  return projektiAdaptationResult.projekti;
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
