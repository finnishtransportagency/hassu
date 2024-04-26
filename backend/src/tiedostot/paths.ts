/**
 * Tässä tiedostossa on uudella tyylillä tehtyjen vaiheiden polkutietoja
 */

import deburr from "lodash/deburr";

export const JULKAISTU_HYVAKSYMISESITYS_PATH = "hyvaksymisesitys";
export const MUOKATTAVA_HYVAKSYMISESITYS_PATH = "muokattava_hyvaksymisesitys";
export function getYllapitoPathForProjekti(oid: string) {
  return `yllapito/tiedostot/projekti/${oid}/`;
}

/**
 * Luo valideja tiedostopoluja osista, riippumatta onko polun alussa tai lopussa kauttaviivaa
 *
 * @param args mielivaltainen määrä stringejä
 * @returns stringit yhdistettynä /-merkillä, muuttaen //-merkit yhdeksi, tiputtaen alusta pois /:n
 */
export function joinPath(...args: string[]): string {
  return args
    .map((str) => str.replace(/^\//, ""))
    .join("/")
    .replace(/\/\//g, "/");
}
/**
 *
 * @param name Tiedoston nimi; loppupääte voi sisältyä siihen
 * @returns Tiedoston nimi, mutta muut kuin A-Z, a-z, 0-9, .-_ kovattuna systemaattisesti muilla merkeillä
 */
export function adaptFileName(name: string): string {
  return deburr(name)
    .replace(/\s/g, "_")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_");
}
