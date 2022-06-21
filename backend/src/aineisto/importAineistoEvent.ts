export enum ImportAineistoEventType {
  IMPORT = "IMPORT",
  PUBLISH_NAHTAVILLAOLO = "PUBLISH_NAHTAVILLAOLO",
}

export type ImportAineistoEvent = {
  type: ImportAineistoEventType;
  oid: string;
  publishVuorovaikutusWithNumero?: number;
  publishNahtavillaoloWithId?: number;
};
