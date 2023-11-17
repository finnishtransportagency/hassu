import {
  EsikatseleLausuntoPyynnonTiedostotQueryVariables,
  EsikatseleLausuntoPyynnonTaydennysTiedostotQueryVariables,
  LadattavatTiedostot,
  ListaaLausuntoPyynnonTiedostotQueryVariables,
  ListaaLausuntoPyynnonTaydennyksenTiedostotQueryVariables,
} from "hassu-common/graphql/apiModel";

class TiedostoDownloadLinkHandler {
  async listaaLausuntoPyynnonAineistot({
    oid,
    listaaLausuntoPyyntoTiedostotInput: params,
  }: ListaaLausuntoPyynnonTiedostotQueryVariables): Promise<LadattavatTiedostot> {
    throw new Error("Not implemented yet");
  }

  async listaaLausuntoPyynnonTaydennysAineistot({
    oid,
    listaaLausuntoPyynnonTaydennyksenTiedostotInput: params,
  }: ListaaLausuntoPyynnonTaydennyksenTiedostotQueryVariables): Promise<LadattavatTiedostot> {
    throw new Error("Not implemented yet");
  }

  async esikatseleLausuntoPyynnonAineistot({
    oid,
    lausuntoPyynto,
  }: EsikatseleLausuntoPyynnonTiedostotQueryVariables): Promise<LadattavatTiedostot> {
    throw new Error("Not implemented yet");
  }

  async esikatseleLausuntoPyynnonTaydennysAineistot({
    oid,
    lausuntoPyynnonTaydennys,
  }: EsikatseleLausuntoPyynnonTaydennysTiedostotQueryVariables): Promise<LadattavatTiedostot> {
    throw new Error("Not implemented yet");
  }
}

export const tiedostoDownloadLinkHandler = new TiedostoDownloadLinkHandler();
