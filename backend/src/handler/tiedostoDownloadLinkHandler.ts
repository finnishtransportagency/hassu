import {
  EsikatseleLausuntoPyynnonAineistotQueryVariables,
  EsikatseleLausuntoPyynnonTaydennysAineistotQueryVariables,
  LisaAineistot,
  ListaaLausuntoPyynnonAineistotQueryVariables,
  ListaaLausuntoPyynnonTaydennyksenAineistotQueryVariables,
} from "hassu-common/graphql/apiModel";

class TiedostoDownloadLinkHandler {
  async listaaLausuntoPyynnonAineistot({
    oid,
    lausuntoPyyntoAineistonTiedot: params,
  }: ListaaLausuntoPyynnonAineistotQueryVariables): Promise<LisaAineistot> {
    throw new Error("Not implemented yet");
  }

  async listaaLausuntoPyynnonTaydennysAineistot({
    oid,
    lausuntoPyynnonTaydennyksenAineistonTiedot: params,
  }: ListaaLausuntoPyynnonTaydennyksenAineistotQueryVariables): Promise<LisaAineistot> {
    throw new Error("Not implemented yet");
  }

  async esikatseleLausuntoPyynnonAineistot({
    oid,
    lausuntoPyynto,
  }: EsikatseleLausuntoPyynnonAineistotQueryVariables): Promise<LisaAineistot> {
    throw new Error("Not implemented yet");
  }

  async esikatseleLausuntoPyynnonTaydennysAineistot({
    oid,
    lausuntoPyynnonTaydennys,
  }: EsikatseleLausuntoPyynnonTaydennysAineistotQueryVariables): Promise<LisaAineistot> {
    throw new Error("Not implemented yet");
  }
}

export const tiedostoDownloadLinkHandler = new TiedostoDownloadLinkHandler();
