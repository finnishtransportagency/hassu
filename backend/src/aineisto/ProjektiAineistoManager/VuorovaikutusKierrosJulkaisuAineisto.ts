import { AineistoPathsPair, VaiheAineisto } from ".";
import { LadattuTiedosto, VuorovaikutusKierrosJulkaisu } from "../../database/model";

export class VuorovaikutusKierrosJulkaisuAineisto extends VaiheAineisto<VuorovaikutusKierrosJulkaisu, unknown> {
  constructor(oid: string, julkaisu: VuorovaikutusKierrosJulkaisu | undefined | null) {
    super(oid, julkaisu, undefined);
  }

  getAineistot(julkaisu: VuorovaikutusKierrosJulkaisu): AineistoPathsPair[] {
    const paths = this.projektiPaths.vuorovaikutus(julkaisu).aineisto;
    return [
      { aineisto: julkaisu.esittelyaineistot, paths },
      { aineisto: julkaisu.suunnitelmaluonnokset, paths },
    ];
  }

  getLadatutTiedostot(): LadattuTiedosto[] {
    return [];
  }

  async synchronize(): Promise<boolean> {
    // VuorovaikutusKierrosAineisto vastuussa tästä
    throw new Error("Not implemented");
  }

  async deleteAineistotIfEpaaktiivinen(): Promise<VuorovaikutusKierrosJulkaisu[]> {
    // VuorovaikutusKierrosAineisto vastuussa tästä
    return [];
  }

  getAsianhallintaSynkronointi(): undefined {
    // VuorovaikutusKierrosAineisto vastuussa tästä
    throw new Error("Not implemented");
  }
}
