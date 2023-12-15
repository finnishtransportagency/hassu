import { AineistoPathsPair, VaiheTiedostoManager } from ".";
import { VuorovaikutusKierrosJulkaisu } from "../../database/model";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";

export class VuorovaikutusKierrosJulkaisuTiedostoManager extends VaiheTiedostoManager<VuorovaikutusKierrosJulkaisu, unknown> {
  constructor(oid: string, julkaisu: VuorovaikutusKierrosJulkaisu | undefined | null) {
    super(oid, julkaisu, undefined);
  }

  getAineistot(julkaisu: VuorovaikutusKierrosJulkaisu): AineistoPathsPair[] {
    const paths = this.projektiPaths.vuorovaikutus(julkaisu).aineisto;
    return [{ aineisto: julkaisu.aineistot, paths }];
  }

  getLadatutTiedostot(): LadattuTiedostoPathsPair[] {
    return [];
  }

  async synchronize(): Promise<boolean> {
    // VuorovaikutusKierrosTiedostoManager vastuussa tästä
    throw new Error("Not implemented");
  }

  async deleteAineistotIfEpaaktiivinen(): Promise<VuorovaikutusKierrosJulkaisu[]> {
    // VuorovaikutusKierrosTiedostoManager vastuussa tästä
    return [];
  }

  getAsianhallintaSynkronointi(): undefined {
    // VuorovaikutusKierrosTiedostoManager vastuussa tästä
    throw new Error("Not implemented");
  }
}
