import { TiedostoManager, AineistoPathsPair } from ".";
import { LausuntoPyynto } from "../../database/model";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";

export class LausuntoPyyntoTiedostoManager extends TiedostoManager<LausuntoPyynto[]> {
  getLadatutTiedostot(vaihe: LausuntoPyynto[]): LadattuTiedostoPathsPair[] {
    return (
      vaihe.reduce((tiedostot, lausuntoPyynto) => {
        const paths = this.projektiPaths.lausuntoPyynto(lausuntoPyynto);
        tiedostot.push({ tiedostot: lausuntoPyynto.lisaAineistot, paths, category: "Lisäaineistot", uuid: lausuntoPyynto.uuid });
        return tiedostot;
      }, [] as LadattuTiedostoPathsPair[]) || []
    );
  }

  getAineistot(): AineistoPathsPair[] {
    return [];
  }
}
