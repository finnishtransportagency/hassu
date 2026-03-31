import { PaatosVaiheJulkaisuTiedot } from "./hyvaksymisPaatosVaihe";

export type ProjektiDataItemSortKey = `${JulkaisuPrefix}${number}`;

export interface IProjektiDataItem<T extends { sortKey: string }> {
  // partition key
  projektiOid: string;
  sortKey: T["sortKey"];
}

export const hyvaksymisPaatosVaiheJulkaisuPrefix = "JULKAISU#HYVAKSYMISPAATOS#";
export const jatkopaatos1VaiheJulkaisuPrefix = "JULKAISU#JATKOPAATOS1#";
export const jatkopaatos2VaiheJulkaisuPrefix = "JULKAISU#JATKOPAATOS2#";

export const julkaisuPrefixes = [
  hyvaksymisPaatosVaiheJulkaisuPrefix,
  jatkopaatos1VaiheJulkaisuPrefix,
  jatkopaatos2VaiheJulkaisuPrefix,
] as const;

export interface HyvaksymisPaatosVaiheJulkaisu
  extends IProjektiDataItem<{ sortKey: `${typeof hyvaksymisPaatosVaiheJulkaisuPrefix}${string}` }>,
    PaatosVaiheJulkaisuTiedot {}
export interface JatkoPaatos1VaiheJulkaisu
  extends IProjektiDataItem<{ sortKey: `${typeof jatkopaatos1VaiheJulkaisuPrefix}${string}` }>,
    PaatosVaiheJulkaisuTiedot {}
export interface JatkoPaatos2VaiheJulkaisu
  extends IProjektiDataItem<{ sortKey: `${typeof jatkopaatos2VaiheJulkaisuPrefix}${string}` }>,
    PaatosVaiheJulkaisuTiedot {}

export type JulkaisuPrefix = (typeof julkaisuPrefixes)[number];
export type JulkaisuByPrefix<P extends JulkaisuPrefix> = P extends typeof hyvaksymisPaatosVaiheJulkaisuPrefix
  ? HyvaksymisPaatosVaiheJulkaisu
  : P extends typeof jatkopaatos1VaiheJulkaisuPrefix
  ? JatkoPaatos1VaiheJulkaisu
  : P extends typeof jatkopaatos2VaiheJulkaisuPrefix
  ? JatkoPaatos2VaiheJulkaisu
  : never;

/** Päätöksillä on paljon jaettua toiminnallisuutta. Tätä unionia näissä toiminnallisuuksissa */
export type PaatosVaiheJulkaisu = HyvaksymisPaatosVaiheJulkaisu | JatkoPaatos1VaiheJulkaisu | JatkoPaatos2VaiheJulkaisu;

export type AnyKuulutusJulkaisu = PaatosVaiheJulkaisu;

export type AnyProjektiDataItem = AnyKuulutusJulkaisu;
