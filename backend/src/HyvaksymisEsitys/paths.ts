// Always start path without slash. Always end path in slash.
export const JULKAISTU_HYVAKSYMISESITYS_PATH = "hyvaksymisesitys/";
export const MUOKATTAVA_HYVAKSYMISESITYS_PATH = "muokattava_hyvaksymisesitys/";
export function getYllapitoPathForProjekti(oid: string) {
  return `yllapito/tiedostot/projekti/${oid}/`;
}

export function joinPath(...args: string[]): string {
  return args.join("/").replace("//", "/");
}
