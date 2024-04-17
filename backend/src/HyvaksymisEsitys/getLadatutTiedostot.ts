import { IHyvaksymisEsitys, ILadattuTiedosto, MuokattavaHyvaksymisEsitys } from "../database/model";
import * as API from "hassu-common/graphql/apiModel";

/**
 *
 * @param vanha Hyväksymisesitys tietokannassa ennen tallennusoperaatiota
 * @param uusi Inputissa annetut hyväksymisesityksen tiedot
 * @returns Inputista poimitut uudet ladatut tiedostot varustettuna tiedolla siitä, minkä avaimen takana ne olivat
 */
export function getHyvaksymisEsityksenUudetLadatutTiedostot(
  vanha: MuokattavaHyvaksymisEsitys | null | undefined,
  uusi: API.HyvaksymisEsitysInput | null | undefined
): (API.LadattuTiedostoInputNew & { avain: string })[] {
  const uudet = getHyvaksymisEsityksenLadatutTiedostot(uusi);
  const vanhat = getHyvaksymisEsityksenLadatutTiedostot(vanha);
  return uudet.filter((tiedosto) => !vanhat.find((vanhaTiedosto) => vanhaTiedosto.uuid == tiedosto.uuid));
}

/**
 *
 * @param vanha Hyväksymisesitys tietokannassa ennen tallennusoperaatiota
 * @param uusi Mitä ollaan tallentamassa hyväksymisesitykseksi
 * @returns Poistuvat ladatut tiedostot varustettuna tiedolla siitä, minkä avaimen takana ne olivat
 */
export function getHyvaksymisEsityksenPoistetutTiedostot(
  vanha: MuokattavaHyvaksymisEsitys | null | undefined,
  uusi: MuokattavaHyvaksymisEsitys | null | undefined
): (ILadattuTiedosto & { avain: string })[] {
  const uudet = getHyvaksymisEsityksenLadatutTiedostot(uusi);
  const vanhat = getHyvaksymisEsityksenLadatutTiedostot(vanha);
  return vanhat.filter((tiedosto) => !uudet.find((vanhaTiedosto) => vanhaTiedosto.uuid == tiedosto.uuid));
}

export function getHyvaksymisEsityksenLadatutTiedostot<A extends IHyvaksymisEsitys | API.HyvaksymisEsitysInput>(
  hyvaksymisEsitys: A | null | undefined
): A extends IHyvaksymisEsitys ? (ILadattuTiedosto & { avain: string })[] : (API.LadattuTiedostoInputNew & { avain: string })[] {
  if (!hyvaksymisEsitys) {
    return [];
  }
  const tiedostot: ((ILadattuTiedosto | API.LadattuTiedostoInputNew) & { avain: string })[] = [];
  hyvaksymisEsitys.kuulutuksetJaKutsu &&
    tiedostot.push(
      ...hyvaksymisEsitys.kuulutuksetJaKutsu.map((tiedosto) => ({
        ...tiedosto,
        avain: "kuulutuksetJaKutsu",
      }))
    );

  hyvaksymisEsitys.lausunnot &&
    tiedostot.push(
      ...hyvaksymisEsitys.lausunnot.map((tiedosto) => ({
        ...tiedosto,
        avain: "lausunnot",
      }))
    );

  hyvaksymisEsitys.hyvaksymisEsitys &&
    tiedostot.push(
      ...hyvaksymisEsitys.hyvaksymisEsitys.map((tiedosto) => ({
        ...tiedosto,
        avain: "hyvaksymisEsitys",
      }))
    );

  hyvaksymisEsitys.maanomistajaluettelo &&
    tiedostot.push(
      ...hyvaksymisEsitys.maanomistajaluettelo.map((tiedosto) => ({
        ...tiedosto,
        avain: "maanomistajaluettelo",
      }))
    );

  hyvaksymisEsitys.muistutukset &&
    tiedostot.push(
      ...hyvaksymisEsitys.muistutukset.map((tiedosto) => ({
        ...tiedosto,
        avain: "muistutukset",
      }))
    );

  hyvaksymisEsitys.muuAineistoKoneelta &&
    tiedostot.push(
      ...hyvaksymisEsitys.muuAineistoKoneelta.map((tiedosto) => ({
        ...tiedosto,
        avain: "muuAineistoKoneelta",
      }))
    );

  return tiedostot as A extends IHyvaksymisEsitys
    ? (ILadattuTiedosto & { avain: string })[]
    : (API.LadattuTiedostoInputNew & { avain: string })[];
}
