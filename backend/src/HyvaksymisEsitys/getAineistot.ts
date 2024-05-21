import { IHyvaksymisEsitys, AineistoNew, MuokattavaHyvaksymisEsitys } from "../database/model";
import { parseDate } from "../util/dateUtil";

/**
 *
 * @param hyvaksymisEsitys
 * @returns Hyväksymisesityksen aineistot varustettuna tiedolla siitä, minkä avaimen takana ne olivat
 */
export default function getHyvaksymisEsityksenAineistot(
  hyvaksymisEsitys: IHyvaksymisEsitys | null | undefined
): (AineistoNew & { avain: string })[] {
  if (!hyvaksymisEsitys) {
    return [] as (AineistoNew & { avain: string })[];
  }
  const aineistot: (AineistoNew & { avain: string })[] = [];
  hyvaksymisEsitys.muuAineistoVelhosta &&
    aineistot.push(...hyvaksymisEsitys.muuAineistoVelhosta.map((aineisto) => ({ ...aineisto, avain: "muuAineistoVelhosta" })));
  hyvaksymisEsitys.suunnitelma &&
    aineistot.push(...hyvaksymisEsitys.suunnitelma.map((aineisto) => ({ ...aineisto, avain: "suunnitelma" })));
  return aineistot;
}

/**
 *
 * @param vanha Hyväksymisesitys db:ssä ennen tallennusoperaatiota
 * @param uusi Mitä ollaan tallentamassa hyväksymisesitykseksi
 * @returns Poistuvat aineistot varustettuna tiedolla siitä, minkä avaimen takana ne olivat
 */
export function getHyvaksymisEsityksenPoistetutAineistot(
  vanha: MuokattavaHyvaksymisEsitys | null | undefined,
  uusi: MuokattavaHyvaksymisEsitys | null | undefined
): (AineistoNew & { avain: string })[] {
  const uudet = getHyvaksymisEsityksenAineistot(uusi);
  const vanhat = getHyvaksymisEsityksenAineistot(vanha);
  return vanhat.filter((tiedosto) => !uudet.find((vanhaTiedosto) => vanhaTiedosto.uuid == tiedosto.uuid));
}

/**
 *
 * @param hyvaksymisEsitys Muokattava hyväksymisesitys tietokannassa
 * @param aineistoHandledAt Aikaleima, jolloin aineistot on käsitelty
 * @returns Hyväksymisesityksen aineistot, joiden aikaleima on aineistoHandledAt jälkeen, varustettuna tiedolla siitä, minkä avaimen takana ne ovat
 */
export function getHyvaksymisEsityksenTuomattomatAineistot(
  hyvaksymisEsitys: MuokattavaHyvaksymisEsitys,
  aineistoHandledAt: string | null | undefined
): (AineistoNew & { avain: string })[] {
  const aineistot = getHyvaksymisEsityksenAineistot(hyvaksymisEsitys);
  return aineistot.filter((aineisto) => !aineistoHandledAt || parseDate(aineisto.lisatty).isAfter(parseDate(aineistoHandledAt)));
}
