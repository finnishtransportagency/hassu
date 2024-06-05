import { adaptHyvaksymisEsitysToAPI } from "../../projekti/adapter/adaptToAPI";
import { requirePermissionLuku } from "../../user";
import * as API from "hassu-common/graphql/apiModel";
import { adaptVelhoToProjektinPerustiedot } from "../adaptToApi/adaptVelhoToProjektinPerustiedot";
import { assertIsDefined } from "../../util/assertions";
import { getKutsut, getMaanomistajaLuettelo } from "../latauslinkit/createLadattavatTiedostot";
import projektiDatabase from "../dynamoKutsut";

export default async function haeHyvaksymisEsityksenTiedot(oid: string): Promise<API.HyvaksymisEsityksenTiedot> {
  requirePermissionLuku();
  const projekti = await projektiDatabase.haeHyvaksymisEsityksenTiedostoTiedot(oid);
  const hyvaksymisEsitys = adaptHyvaksymisEsitysToAPI(projekti);
  const { versio, hyvaksymisPaatosVaihe } = projekti;
  assertIsDefined(projekti.velho, "projektilla tulee olla velho");

  return {
    __typename: "HyvaksymisEsityksenTiedot",
    oid,
    versio,
    hyvaksymisEsitys,
    vaiheOnAktiivinen: false,
    voiLahettaaHyvaksyttavaksi: false,
    muokkauksenVoiAvata: !hyvaksymisPaatosVaihe && hyvaksymisEsitys?.tila == API.HyvaksymisTila.HYVAKSYTTY,
    perustiedot: adaptVelhoToProjektinPerustiedot(projekti.velho),
    tuodutTiedostot: {
      __typename: "HyvaksymisEsityksenTuodutTiedostot",
      maanomistajaluettelo: await getMaanomistajaLuettelo(projekti),
      kuulutuksetJaKutsu: await getKutsut(projekti),
    },
  };
}
