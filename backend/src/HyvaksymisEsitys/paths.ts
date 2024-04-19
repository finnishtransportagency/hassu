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
    .replace("//", "/");
}
