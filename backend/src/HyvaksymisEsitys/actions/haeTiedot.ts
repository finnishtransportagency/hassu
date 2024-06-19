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
import heVaiheOnAktiivinen from "../vaiheOnAktiivinen";

export default async function haeHyvaksymisEsityksenTiedot(oid: string): Promise<API.HyvaksymisEsityksenTiedot> {
  requirePermissionLuku();
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  assertIsDefined(dbProjekti, "projektia ei löydy");
  assertIsDefined(dbProjekti.velho, "projektilla tulee olla velho");

  const vaiheOnAktiivinen = await heVaiheOnAktiivinen(dbProjekti);
  const { versio, aineistoHandledAt, velho } = dbProjekti;
  const hyvaksymisEsitys = adaptHyvaksymisEsitysToAPI(dbProjekti);

  const aineistot = getHyvaksymisEsityksenAineistot(dbProjekti.muokattavaHyvaksymisEsitys);

  const muokkauksenVoiAvata = vaiheOnAktiivinen && hyvaksymisEsitys?.tila === API.HyvaksymisTila.HYVAKSYTTY;

  return {
    __typename: "HyvaksymisEsityksenTiedot",
    oid,
    versio,
    hyvaksymisEsitys,
    vaiheOnAktiivinen,
    muokkauksenVoiAvata,
    aineistotValmiit: aineistotValmiit(aineistot, aineistoHandledAt),
    perustiedot: adaptVelhoToProjektinPerustiedot(velho),
    tuodutTiedostot: {
      __typename: "HyvaksymisEsityksenTuodutTiedostot",
      maanomistajaluettelo: await getMaanomistajaLuettelo(dbProjekti),
      kuulutuksetJaKutsu: await getKutsut(dbProjekti),
    },
  };
}

function aineistotValmiit(aineistot: AineistoNew[], aineistoHandledAt: string | null | undefined): boolean {
  return !!aineistoHandledAt && aineistot.every((aineisto) => dayjs(aineisto.lisatty).isBefore(dayjs(aineistoHandledAt)));
}
