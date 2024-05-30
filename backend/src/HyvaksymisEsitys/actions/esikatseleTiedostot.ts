import * as API from "hassu-common/graphql/apiModel";
import { adaptHyvaksymisEsitysToSave } from "../adaptToSave/adaptHyvaksymisEsitysToSave";
import createLadattavatTiedostot from "../latauslinkit/createLadattavatTiedostot";
import haeHyvaksymisEsityksenTiedostoTiedot, { ProjektiTiedostoineen } from "../dynamoDBCalls/getProjektiTiedostoineen";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../../user";
import { adaptProjektiKayttajaJulkinen } from "../../projekti/adapter/adaptToAPI";
import { assertIsDefined } from "../../util/assertions";
import { adaptLaskutustiedotToAPI } from "../adaptToApi/adaptLaskutustiedotToAPI";
import { adaptVelhoToProjektinPerustiedot } from "../adaptToApi/adaptVelhoToProjektinPerustiedot";

export default async function esikatseleHyvaksymisEsityksenTiedostot({
  oid,
  hyvaksymisEsitys: hyvaksymisEsitysInput,
}: API.EsikatseleHyvaksymisEsityksenTiedostotQueryVariables): Promise<API.HyvaksymisEsityksenAineistot> {
  requirePermissionLuku();
  const dbProjekti: ProjektiTiedostoineen = await haeHyvaksymisEsityksenTiedostoTiedot(oid);
  requirePermissionMuokkaa(dbProjekti);
  const muokattavaHyvaksymisEsitys = adaptHyvaksymisEsitysToSave(dbProjekti.muokattavaHyvaksymisEsitys, hyvaksymisEsitysInput);
  const ladattavatTiedostot = await createLadattavatTiedostot(dbProjekti, muokattavaHyvaksymisEsitys);
  const projari = dbProjekti.kayttoOikeudet.find((hlo) => (hlo.tyyppi = API.KayttajaTyyppi.PROJEKTIPAALLIKKO));
  assertIsDefined(projari, "projektilla tulee olla projektipäällikkö");
  assertIsDefined(dbProjekti.velho, "projektilla tulee olla velho");

  return {
    __typename: "HyvaksymisEsityksenAineistot",
    aineistopaketti: "(esikatselu)",
    ...ladattavatTiedostot,
    perustiedot: adaptVelhoToProjektinPerustiedot(dbProjekti.velho),
    laskutustiedot: adaptLaskutustiedotToAPI(muokattavaHyvaksymisEsitys.laskutustiedot),
    poistumisPaiva: muokattavaHyvaksymisEsitys.poistumisPaiva,
    projektipaallikonYhteystiedot: adaptProjektiKayttajaJulkinen(projari),
    lisatiedot: muokattavaHyvaksymisEsitys.lisatiedot,
  };
}
