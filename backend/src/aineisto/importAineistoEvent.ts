export enum ImportAineistoEventType {
  IMPORT = "IMPORT",
  SYNCHRONIZE = "SYNCHRONIZE",
}

export type ImportAineistoEvent = {
  type: ImportAineistoEventType;
  oid: string;
  scheduleName?: string;
  retriesLeft?: number;
  reason?: string;
};
