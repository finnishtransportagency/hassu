import { IEnnakkoNeuvottelu, ILadattuTiedosto } from "../database/model";
import * as API from "hassu-common/graphql/apiModel";

/**
 *
 * @param vanha Hyväksymisesitys tietokannassa ennen tallennusoperaatiota
 * @param uusi Inputissa annetut hyväksymisesityksen tiedot
 * @returns Inputista poimitut uudet ladatut tiedostot varustettuna tiedolla siitä, minkä avaimen takana ne olivat
 */
export function getHyvaksymisEsityksenUudetLadatutTiedostot(
  vanha: IEnnakkoNeuvottelu | null | undefined,
  uusi: API.HyvaksymisEsitysInput | API.EnnakkoNeuvotteluInput | null | undefined
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
  vanha: IEnnakkoNeuvottelu | null | undefined,
  uusi: IEnnakkoNeuvottelu | null | undefined
): (ILadattuTiedosto & { avain: string })[] {
  const uudet = getHyvaksymisEsityksenLadatutTiedostot(uusi);
  const vanhat = getHyvaksymisEsityksenLadatutTiedostot(vanha);
  return vanhat.filter((tiedosto) => !uudet.find((vanhaTiedosto) => vanhaTiedosto.uuid == tiedosto.uuid));
}

/**
 *
 * @param hyvaksymisEsitys DB- tai input-muotoinen hyväksymisesitys
 * @returns Annetun hyväksymisesityksen ladatut tiedostot varustettuna tiedolla siitä, minkä avaimen takana ne olivat
 */
export function getHyvaksymisEsityksenLadatutTiedostot<A extends IEnnakkoNeuvottelu | API.HyvaksymisEsitysInput>(
  hyvaksymisEsitys: A | null | undefined
): A extends IEnnakkoNeuvottelu ? (ILadattuTiedosto & { avain: string })[] : (API.LadattuTiedostoInputNew & { avain: string })[] {
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
  if ("hyvaksymisEsitys" in hyvaksymisEsitys) {
    hyvaksymisEsitys.hyvaksymisEsitys &&
      tiedostot.push(
        ...hyvaksymisEsitys.hyvaksymisEsitys.map((tiedosto) => ({
          ...tiedosto,
          avain: "hyvaksymisEsitys",
        }))
      );
  }

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

  return tiedostot as A extends IEnnakkoNeuvottelu
    ? (ILadattuTiedosto & { avain: string })[]
    : (API.LadattuTiedostoInputNew & { avain: string })[];
}
