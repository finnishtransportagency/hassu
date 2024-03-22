import * as API from "hassu-common/graphql/apiModel";
import { projektiDatabase } from "../database/projektiDatabase";
import { auditLog } from "../logger";
import { projektiAdapter } from "../projekti/adapter/projektiAdapter";
import { DBProjekti } from "../database/model";
import { requirePermissionMuokkaa } from "../user";
import { IllegalArgumentError } from "hassu-common/error";
import { omit } from "lodash";

export async function tallenna(
  teeHyvaksymisEsitysToimintoInput: API.TeeHyvaksymisEsitysToimintoInput,
  projektiInDB: DBProjekti
): Promise<DBProjekti> {
  validate(projektiInDB);
  auditLog.info("Tallenna hyväksymisesitys", { teeHyvaksymisEsitysToimintoInput });
  // Input-tyypitys ei estä sitä, ettei inputissa ole "syy" mukana, vaikka se ei ole tallenna-toiminnossa relevantti
  // joten poistetaan tästä mahdollinen syy-kenttä.
  const projektiAdaptationResult = await projektiAdapter.adaptProjektiToSave(projektiInDB, omit(teeHyvaksymisEsitysToimintoInput, "syy"));
  await projektiDatabase.saveProjekti(projektiAdaptationResult.projekti);
  //TODO: reagoi projektiAdaptationResultista tuleviin eventteihin
  return projektiAdaptationResult.projekti;
}

function validate(projektiInDB: DBProjekti) {
  // Toiminnon tekijän on oltava projektihenkilö
  requirePermissionMuokkaa(projektiInDB);
  // Projektilla on oltava muokkaustilainen hyväksymisesitys tai
  // ei muokattavaa tai julkaistua hyväksymisesitystä
  if (
    (!projektiInDB.muokattavaHyvaksymisEsitys && !projektiInDB.julkaistuHyvaksymisEsitys) ||
    projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.MUOKKAUS
  ) {
    throw new IllegalArgumentError("Projektilla tulee olla muokkaustilainen hyväksymisesitys tai ei vielä lainkaan hyväksymisesitystä");
  }
  // TODO muu validointi? Mieti tarvitseeko vielä jotain
}
