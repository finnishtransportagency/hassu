export interface IProjektiDataItem<T extends { sortKey: string }> {
  // partition key
  projektiOid: string;
  sortKey: T["sortKey"];
}
