import { DBProjekti } from "../../database/model";
import { TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { requirePermissionMuokkaa } from "../../user";
import { projektiAdapter } from "../adapter/projektiAdapter";
import { validateKasittelynTila } from "./validateKasittelyntila";
import { validateKielivalinta } from "./validateKielivalinta";
import { validateEuRahoitus } from "./validateEuRahoitus";
import { validateVarahenkiloModifyPermissions } from "./validateVarahenkiloModifyPermissions";
import { validateUudelleenKuulutus } from "./validateUudelleenkuulutus";
import { validateSuunnitteluSopimus } from "./validateSuunnittelusopimus";
import { validateVahainenMenettely } from "./validateVahainenMenettely";
import { validateVuorovaikutuskierrokset } from "./validateVuorovaikutuskierrokset";
import { validateNahtavillaoloVaihe } from "./validateNahtavillaoloVaihe";
import { validateLausuntoPyynnot } from "./validateLausuntoPyynnot";
import { validateLausuntoPyyntojenTaydennykset } from "./validateLausuntoPyyntojenTaydennykset";
import { validateHyvaksymisPaatosJatkoPaatos } from "./validateHyvaksymisPaatosJatkoPaatos";
import { validateKayttoOikeusElyOrganisaatio } from "./validateKayttoOikeusElyOrganisaatio";
import { validateAloituskuulutus } from "./validateAloituskuulutus";
import { validateAsianhallinnanAktivointikytkin } from "./validateAsianhallintaAktivointikytkin";

export async function validateTallennaProjekti(projekti: DBProjekti, input: TallennaProjektiInput): Promise<void> {
  requirePermissionMuokkaa(projekti);
  const apiProjekti = await projektiAdapter.adaptProjekti(projekti, undefined, false);
  validateKielivalinta(projekti, apiProjekti, input);
  validateEuRahoitus(projekti, apiProjekti, input);
  validateKasittelynTila(projekti, apiProjekti, input);
  validateVarahenkiloModifyPermissions(projekti, input);
  validateSuunnitteluSopimus(projekti, apiProjekti, input);
  validateVahainenMenettely(projekti, apiProjekti, input);
  validateVuorovaikutuskierrokset(projekti, input);
  validateUudelleenKuulutus(projekti, input);
  validateAloituskuulutus(projekti, input.aloitusKuulutus);
  validateNahtavillaoloVaihe(projekti, apiProjekti, input);
  validateLausuntoPyynnot(projekti, input);
  validateLausuntoPyyntojenTaydennykset(projekti, input);
  validateHyvaksymisPaatosJatkoPaatos(projekti, apiProjekti, input);
  validateAsianhallinnanAktivointikytkin(apiProjekti, input);
  await validateKayttoOikeusElyOrganisaatio(projekti, input);
}
