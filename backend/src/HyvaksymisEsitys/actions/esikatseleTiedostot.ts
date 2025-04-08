import * as API from "hassu-common/graphql/apiModel";
import { adaptHyvaksymisEsitysToSave } from "../adaptToSave/adaptHyvaksymisEsitysToSave";
import createLadattavatTiedostot from "../latauslinkit/createLadattavatTiedostot";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../../user";
import { adaptProjektiKayttajaJulkinen } from "../../projekti/adapter/adaptToAPI";
import { assertIsDefined } from "../../util/assertions";
import { adaptLaskutustiedotToAPI } from "../adaptToApi/adaptLaskutustiedotToAPI";
import projektiDatabase, { ProjektiTiedostoineen } from "../dynamoKutsut";
import { adaptVelhoToProjektinPerustiedot } from "../adaptToApi/adaptVelhoToProjektinPerustiedot";
import { getYllapitoPathForProjekti, joinPath, JULKAISTU_HYVAKSYMISESITYS_PATH } from "../../tiedostot/paths";
import { IllegalArgumentError } from "hassu-common/error";
import GetProjektiStatus from "../../projekti/status/getProjektiStatus";

export async function esikatseleHyvaksyttavaHyvaksymisEsityksenTiedostot({
  oid,
}: API.EsikatseleHyvaksyttavaHyvaksymisEsityksenTiedostotQueryVariables) {
  const dbProjekti: ProjektiTiedostoineen = await validateProjektiPermissions(oid);
  const projari = validateProjari(dbProjekti);
  assertIsDefined(dbProjekti.velho, "Projektilta puuttuu Projektivelhotiedot");

  const muokattavaHyvaksymisEsitys = dbProjekti.muokattavaHyvaksymisEsitys;

  if (muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA) {
    throw new IllegalArgumentError(`Hyväksymisesitys ei odota hyväksyntää. Esikatselua ei voi tehdä tällä hetkellä.`);
  }

  const aineistopaketti = dbProjekti.hyvEsAineistoPaketti
    ? "/" + joinPath(getYllapitoPathForProjekti(dbProjekti.oid), JULKAISTU_HYVAKSYMISESITYS_PATH, "aineisto.zip")
    : undefined;

  const status: API.Status = await GetProjektiStatus.getProjektiStatus(dbProjekti);
  const ladattavatTiedostot = await createLadattavatTiedostot(dbProjekti, muokattavaHyvaksymisEsitys, status);

  return {
    __typename: "HyvaksymisEsityksenAineistot",
    aineistopaketti,
    ...ladattavatTiedostot,
    perustiedot: adaptVelhoToProjektinPerustiedot(dbProjekti.velho),
    laskutustiedot: adaptLaskutustiedotToAPI(muokattavaHyvaksymisEsitys.laskutustiedot),
    poistumisPaiva: muokattavaHyvaksymisEsitys.poistumisPaiva,
    projektipaallikonYhteystiedot: adaptProjektiKayttajaJulkinen(projari),
    lisatiedot: muokattavaHyvaksymisEsitys.lisatiedot,
    kiireellinen: muokattavaHyvaksymisEsitys.kiireellinen,
  };
}

export async function esikatseleHyvaksymisEsityksenTiedostot({
  oid,
  hyvaksymisEsitys: hyvaksymisEsitysInput,
}: API.EsikatseleHyvaksymisEsityksenTiedostotQueryVariables): Promise<API.HyvaksymisEsityksenAineistot> {
  const dbProjekti: ProjektiTiedostoineen = await validateProjektiPermissions(oid);
  const projari = validateProjari(dbProjekti);
  assertIsDefined(dbProjekti.velho, "Projektilta puuttuu Projektivelhotiedot");

  const muokattavaHyvaksymisEsitys = adaptHyvaksymisEsitysToSave(dbProjekti.muokattavaHyvaksymisEsitys, hyvaksymisEsitysInput);
  const status: API.Status = await GetProjektiStatus.getProjektiStatus(dbProjekti);
  const ladattavatTiedostot = await createLadattavatTiedostot(dbProjekti, muokattavaHyvaksymisEsitys, status);
  return {
    __typename: "HyvaksymisEsityksenAineistot",
    aineistopaketti: undefined,
    ...ladattavatTiedostot,
    perustiedot: adaptVelhoToProjektinPerustiedot(dbProjekti.velho),
    laskutustiedot: adaptLaskutustiedotToAPI(muokattavaHyvaksymisEsitys.laskutustiedot),
    poistumisPaiva: muokattavaHyvaksymisEsitys.poistumisPaiva,
    projektipaallikonYhteystiedot: adaptProjektiKayttajaJulkinen(projari),
    lisatiedot: muokattavaHyvaksymisEsitys.lisatiedot,
    kiireellinen: muokattavaHyvaksymisEsitys.kiireellinen,
  };
}

function validateProjari(dbProjekti: ProjektiTiedostoineen) {
  const projari = dbProjekti.kayttoOikeudet.find((hlo) => hlo.tyyppi === API.KayttajaTyyppi.PROJEKTIPAALLIKKO);
  assertIsDefined(projari, "Projektilta puuttuu projektipäällikkö");
  return projari;
}

async function validateProjektiPermissions(oid: string) {
  requirePermissionLuku();
  const dbProjekti: ProjektiTiedostoineen = await projektiDatabase.haeHyvaksymisEsityksenTiedostoTiedot(oid);
  requirePermissionMuokkaa(dbProjekti);
  return dbProjekti;
}
