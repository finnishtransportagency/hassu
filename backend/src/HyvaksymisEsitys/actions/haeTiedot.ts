import { adaptDBVaylaUsertoAPIProjektiKayttaja, adaptHyvaksymisEsitysToAPI } from "../../projekti/adapter/adaptToAPI";
import { requirePermissionLuku } from "../../user";
import * as API from "hassu-common/graphql/apiModel";
import { assertIsDefined } from "../../util/assertions";
import projektiDatabase from "../dynamoKutsut";
import getHyvaksymisEsityksenAineistot from "../getAineistot";
import { AineistoNew } from "../../database/model";
import dayjs from "dayjs";
import heVaiheOnAktiivinen from "../vaiheOnAktiivinen";
import { getKutsut, getMaanomistajaLuettelo } from "../collectHyvaksymisEsitysAineistot";
import { adaptFileInfoToLadattavaTiedosto } from "../latauslinkit/createLadattavatTiedostot";
import { asianhallintaService } from "../../asianhallinta/asianhallintaService";
import { adaptAsianhallintaToAPI } from "../adaptToApi/adaptAsianhallintaToAPI";
import { adaptVelhoToProjektinPerustiedot } from "../adaptToApi/adaptVelhoToProjektinPerustiedot";

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
      maanomistajaluettelo: await Promise.all(getMaanomistajaLuettelo(dbProjekti).map(adaptFileInfoToLadattavaTiedosto)),
      kuulutuksetJaKutsu: await Promise.all(getKutsut(dbProjekti).map(adaptFileInfoToLadattavaTiedosto)),
    },
    ashaTila: await asianhallintaService.checkAsianhallintaStateForKnownProjekti(dbProjekti, "HYVAKSYMISESITYS"),
    asianhallinta: await adaptAsianhallintaToAPI(dbProjekti),
    kayttoOikeudet: adaptDBVaylaUsertoAPIProjektiKayttaja(dbProjekti.kayttoOikeudet),
  };
}

function aineistotValmiit(aineistot: AineistoNew[], aineistoHandledAt: string | null | undefined): boolean {
  return !!aineistoHandledAt && aineistot.every((aineisto) => dayjs(aineisto.lisatty).isBefore(dayjs(aineistoHandledAt)));
}
