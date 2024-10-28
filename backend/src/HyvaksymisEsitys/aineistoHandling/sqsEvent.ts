export enum HyvaksymisEsitysAineistoOperation {
  TUO_HYV_ES_TIEDOSTOT = "TUO_HYV_ES_AINEISTOT",
  ZIP_HYV_ES_AINEISTOT = "ZIP_HYV_ES_AINEISTOT",
  TUO_ENNAKKONEUVOTTELU_TIEDOSTOT = "TUO_ENNAKKONEUVOTTELU_AINEISTOT",
  ZIP_ENNAKKONEUVOTTELU_TIEDOSTOT = "ZIP_ENNAKKONEUVOTTELU_AINEISTOT",
}

export type SqsEvent = {
  oid: string;
  operation: HyvaksymisEsitysAineistoOperation;
  retriesLeft?: number;
  reason?: string;
  date?: string;
};
