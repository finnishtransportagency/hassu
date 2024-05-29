import { adaptHyvaksymisEsitysToAPI } from "../../projekti/adapter/adaptToAPI";
import { requirePermissionLuku } from "../../user";
import * as API from "hassu-common/graphql/apiModel";
import { adaptVelhoToProjektinPerustiedot } from "../adaptToApi/adaptVelhoToProjektinPerustiedot";
import { assertIsDefined } from "../../util/assertions";
import haeHyvaksymisEsityksenTiedostoTiedot from "../dynamoDBCalls/getProjektiTiedostoineen";
import { getKutsut, getMaanomistajaLuettelo } from "../latauslinkit/createLadattavatTiedostot";

export default async function haeHyvaksymisEsityksenTiedot(oid: string): Promise<API.HyvaksymisEsityksenTiedot> {
  requirePermissionLuku();
  const projekti = await haeHyvaksymisEsityksenTiedostoTiedot(oid);
  const hyvaksymisEsitys = adaptHyvaksymisEsitysToAPI(projekti);
  const { versio, hyvaksymisPaatosVaihe } = projekti;
  assertIsDefined(projekti.velho, "projektilla tulee olla velho");

  return {
    __typename: "HyvaksymisEsityksenTiedot",
    oid,
    versio,
    hyvaksymisEsitys,
    muokkauksenVoiAvata: !hyvaksymisPaatosVaihe && hyvaksymisEsitys?.tila == API.HyvaksymisTila.HYVAKSYTTY,
    perustiedot: adaptVelhoToProjektinPerustiedot(projekti.velho),
    tuodutTiedostot: {
      __typename: "HyvaksymisEsityksenTuodutTiedostot",
      maanomistajaluettelo: await getMaanomistajaLuettelo(projekti),
      kuulutuksetJaKutsu: await getKutsut(projekti),
    },
  };
}
