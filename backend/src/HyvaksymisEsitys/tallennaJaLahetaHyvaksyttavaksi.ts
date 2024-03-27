import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../database/model";
import { requirePermissionMuokkaa } from "../user";
import { IllegalArgumentError } from "hassu-common/error";
import { assertIsDefined } from "../util/assertions";
import getTiedostotKeepReference from "./getTiedostotKeepReference";
import { varmistaLukuoikeusJaHaeProjekti } from "./util";
import { tallennaHyvaksymisEsitysHelper } from "./tallenna";

export async function tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi(input: API.TallennaHyvaksymisEsitysInput): Promise<string> {
  const { oid } = input;
  const projektiInDB = await varmistaLukuoikeusJaHaeProjekti(oid);
  validate(projektiInDB);
  await tallennaHyvaksymisEsitysHelper(input, projektiInDB);
  // TODO: päivitä muokattavaHyvaksymisEsityksen tila palautetuksi ja päivitä palautusSyy null:ksi
  return oid;
}

function validate(projektiInDB: DBProjekti) {
  // Toiminnon tekijän on oltava projektihenkilö
  requirePermissionMuokkaa(projektiInDB);
  const muokattavaHyvaksymisEsitys = projektiInDB.muokattavaHyvaksymisEsitys;
  // Projektilla on oltava muokkaustilainen hyväksymisesitys
  if (projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.MUOKKAUS) {
    throw new IllegalArgumentError("Projektilla ei ole muokkaustilaista hyväksymisesitystä");
  }
  assertIsDefined(muokattavaHyvaksymisEsitys, "muokattavaHyvaksymisEsitys on oltava määritelty");
  // Validoi, että kaikki kentät on täytetty (poistumisPaivan olemassaolo varmistetaan tallennuksessa)
  if (!muokattavaHyvaksymisEsitys.laskutustiedot) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole laskutustietoja");
  }
  if (!muokattavaHyvaksymisEsitys.hyvaksymisEsitys?.length) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole hyväksymisesitys-tiedostoa");
  }
  if (!muokattavaHyvaksymisEsitys.suunnitelma?.length) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole hyväksymisesitys-tiedostoa");
  }
  if (!muokattavaHyvaksymisEsitys.muistutukset?.length) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole muistutuksia");
  }
  if (!muokattavaHyvaksymisEsitys.lausunnot?.length) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole lausuntoja");
  }
  if (!muokattavaHyvaksymisEsitys.maanomistajaluettelo?.length) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole maanomistajaluetteloa");
  }
  if (!muokattavaHyvaksymisEsitys.kuulutuksetJaKutsu?.length) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole kuulutuksia ja kutsua");
  }
  if (!muokattavaHyvaksymisEsitys.vastaanottajat?.length) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole vastaanottajia");
  }
  // Aineistojen ja ladattujen tiedostojen on oltava valmiita
  const { aineistot, ladatutTiedostot } = getTiedostotKeepReference(muokattavaHyvaksymisEsitys);
  if (
    !(
      aineistot.every((aineisto) => aineisto.tila == API.AineistoTila.VALMIS) &&
      ladatutTiedostot.every((ladattuTiedosto) => ladattuTiedosto.tila == API.LadattuTiedostoTila.VALMIS)
    )
  ) {
    console.log(aineistot.find((aineisto) => aineisto.tila != API.AineistoTila.VALMIS));
    console.log(ladatutTiedostot.find((ladattuTiedosto) => ladattuTiedosto.tila != API.LadattuTiedostoTila.VALMIS));
    throw new IllegalArgumentError("Tiedostojen on oltava valmiita ennen kuin hyväksymisesitys lähetetään hyväksyttäväksi.");
  }
}
