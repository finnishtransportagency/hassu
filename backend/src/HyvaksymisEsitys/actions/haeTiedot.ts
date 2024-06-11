import { adaptHyvaksymisEsitysToAPI } from "../../projekti/adapter/adaptToAPI";
import { requirePermissionLuku } from "../../user";
import * as API from "hassu-common/graphql/apiModel";
import { adaptVelhoToProjektinPerustiedot } from "../adaptToApi/adaptVelhoToProjektinPerustiedot";
import { assertIsDefined } from "../../util/assertions";
import { getKutsut, getMaanomistajaLuettelo } from "../latauslinkit/createLadattavatTiedostot";
import projektiDatabase from "../dynamoKutsut";
import getHyvaksymisEsityksenAineistot from "../getAineistot";
import { AineistoNew } from "../../database/model";
import dayjs from "dayjs";

export default async function haeHyvaksymisEsityksenTiedot(oid: string): Promise<API.HyvaksymisEsityksenTiedot> {
  requirePermissionLuku();
  const projekti = await projektiDatabase.haeHyvaksymisEsityksenTiedostoTiedot(oid);
  const hyvaksymisEsitys = adaptHyvaksymisEsitysToAPI(projekti);
  const { versio, hyvaksymisPaatosVaihe, aineistoHandledAt } = projekti;
  assertIsDefined(projekti.velho, "projektilla tulee olla velho");
  const aineistot = getHyvaksymisEsityksenAineistot(projekti.muokattavaHyvaksymisEsitys);

  return {
    __typename: "HyvaksymisEsityksenTiedot",
    oid,
    versio,
    hyvaksymisEsitys,
    vaiheOnAktiivinen: false,
    aineistotValmiit: aineistotValmiit(aineistot, aineistoHandledAt),
    muokkauksenVoiAvata: !hyvaksymisPaatosVaihe && hyvaksymisEsitys?.tila == API.HyvaksymisTila.HYVAKSYTTY,
    perustiedot: adaptVelhoToProjektinPerustiedot(projekti.velho),
    tuodutTiedostot: {
      __typename: "HyvaksymisEsityksenTuodutTiedostot",
      maanomistajaluettelo: await getMaanomistajaLuettelo(projekti),
      kuulutuksetJaKutsu: await getKutsut(projekti),
    },
  };
}

function aineistotValmiit(aineistot: AineistoNew[], aineistoHandledAt: string | null | undefined): boolean {
  return !!aineistoHandledAt && aineistot.every((aineisto) => dayjs(aineisto.lisatty).isBefore(dayjs(aineistoHandledAt)));
}
