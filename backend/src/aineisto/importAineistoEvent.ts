export enum ImportAineistoEventType {
  IMPORT = "IMPORT",
  PUBLISH_NAHTAVILLAOLO = "PUBLISH_NAHTAVILLAOLO",
  PUBLISH_HYVAKSYMISPAATOS = "PUBLISH_HYVAKSYMISPAATOS",
  PUBLISH_JATKOPAATOS1 = "PUBLISH_JATKOPAATOS1",
  PUBLISH_JATKOPAATOS2 = "PUBLISH_JATKOPAATOS2",
}

export type ImportAineistoEvent = {
  type: ImportAineistoEventType;
  oid: string;
  publishVuorovaikutusWithNumero?: number;
  publishNahtavillaoloWithId?: number;
  publishHyvaksymisPaatosWithId?: number;
  publishJatkoPaatos1WithId?: number;
  publishJatkoPaatos2WithId?: number;
};
