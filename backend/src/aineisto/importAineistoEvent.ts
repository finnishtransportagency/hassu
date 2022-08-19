export enum ImportAineistoEventType {
  IMPORT = "IMPORT",
  PUBLISH_NAHTAVILLAOLO = "PUBLISH_NAHTAVILLAOLO",
  PUBLISH_HYVAKSYMISPAATOS = "PUBLISH_HYVAKSYMISPAATOS",
}

export type ImportAineistoEvent = {
  type: ImportAineistoEventType;
  oid: string;
  publishVuorovaikutusWithNumero?: number;
  publishNahtavillaoloWithId?: number;
  publishHyvaksymisPaatosWithId?: number;
};
