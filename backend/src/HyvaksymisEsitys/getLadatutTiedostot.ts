import { IHyvaksymisEsitys, ILadattuTiedosto, MuokattavaHyvaksymisEsitys } from "../database/model";

/**
 *
 * @param vanha Hyväksymisesitys tietokannassa ennen tallennusoperaatiota
 * @param uusi Mitä ollaan tallentamassa hyväksymisesitykseksi
 * @returns Uudet ladatut tiedostot varustettuna tiedolla siitä, minkä avaimen takana ne olivat
 */
export function getHyvaksymisEsityksenUudetLadatutTiedostot(
  vanha: MuokattavaHyvaksymisEsitys | null | undefined,
  uusi: MuokattavaHyvaksymisEsitys | null | undefined
): (ILadattuTiedosto & { avain: string })[] {
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

function getHyvaksymisEsityksenLadatutTiedostot(
  hyvaksymisEsitys: IHyvaksymisEsitys | null | undefined
): (ILadattuTiedosto & { avain: string })[] {
  if (!hyvaksymisEsitys) {
    return [] as (ILadattuTiedosto & { avain: string })[];
  }
  const tiedostot: (ILadattuTiedosto & { avain: string })[] = [];
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

  return tiedostot;
}
