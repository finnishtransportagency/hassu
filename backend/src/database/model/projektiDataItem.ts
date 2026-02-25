import { PaatosVaiheJulkaisuTiedot } from "./hyvaksymisPaatosVaihe";

export type ProjektiDataItemSortKey = `${PaatosJulkaisuPrefix}${number}`;

export interface IProjektiDataItem<T extends { sortKey: string }> {
  // partition key
  projektiOid: string;
  sortKey: T["sortKey"];
}

export const hyvaksymisPaatosVaiheJulkaisuPrefix = "JULKAISU_HYVAKSYMISPAATOS_";
export const jatkopaatos1VaiheJulkaisuPrefix = "JULKAISU_JATKOPAATOS1_";
export const jatkopaatos2VaiheJulkaisuPrefix = "JULKAISU_JATKOPAATOS2_";
export const julkaisuPrefixes = [
  hyvaksymisPaatosVaiheJulkaisuPrefix,
  jatkopaatos1VaiheJulkaisuPrefix,
  jatkopaatos2VaiheJulkaisuPrefix,
] as const;
export type PaatosJulkaisuPrefix = (typeof julkaisuPrefixes)[number];
export interface HyvaksymisPaatosVaiheJulkaisu
  extends IProjektiDataItem<{ sortKey: `${typeof hyvaksymisPaatosVaiheJulkaisuPrefix}${number}` }>,
    PaatosVaiheJulkaisuTiedot {}
export interface JatkoPaatos1VaiheJulkaisu
  extends IProjektiDataItem<{ sortKey: `${typeof jatkopaatos1VaiheJulkaisuPrefix}${number}` }>,
    PaatosVaiheJulkaisuTiedot {}
export interface JatkoPaatos2VaiheJulkaisu
  extends IProjektiDataItem<{ sortKey: `${typeof jatkopaatos2VaiheJulkaisuPrefix}${number}` }>,
    PaatosVaiheJulkaisuTiedot {}

export type PaatosVaiheJulkaisu = HyvaksymisPaatosVaiheJulkaisu | JatkoPaatos1VaiheJulkaisu | JatkoPaatos2VaiheJulkaisu;

export type AnyProjektiDataItem = HyvaksymisPaatosVaiheJulkaisu | JatkoPaatos1VaiheJulkaisu | JatkoPaatos2VaiheJulkaisu;
