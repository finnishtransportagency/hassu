import { AineistoPathsPair, VaiheTiedostoManager } from ".";
import { VuorovaikutusKierrosJulkaisu } from "../../database/model";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";

export class VuorovaikutusKierrosJulkaisuTiedostoManager extends VaiheTiedostoManager<VuorovaikutusKierrosJulkaisu, unknown> {
  private index: number;
  constructor(oid: string, julkaisu: VuorovaikutusKierrosJulkaisu | undefined | null, index: number) {
    super(oid, julkaisu, undefined);
    this.index = index;
  }

  getAineistot(julkaisu: VuorovaikutusKierrosJulkaisu): AineistoPathsPair[] {
    const paths = this.projektiPaths.vuorovaikutus(julkaisu).aineisto;
    return [{ aineisto: julkaisu.aineistot, paths, pathInDBProjekti: `vuorovaikutusKierrosJulkaisut.${this.index}.aineistot` }];
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
