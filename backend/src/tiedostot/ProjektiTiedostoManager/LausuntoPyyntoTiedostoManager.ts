import { TiedostoManager, AineistoPathsPair } from ".";
import { LausuntoPyynto } from "../../database/model";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";

export class LausuntoPyyntoTiedostoManager extends TiedostoManager<LausuntoPyynto[]> {
  getLadatutTiedostot(vaihe: LausuntoPyynto[]): LadattuTiedostoPathsPair[] {
    return (
      vaihe.reduce((tiedostot, lausuntoPyynto, index) => {
        const paths = this.projektiPaths.lausuntoPyynto(lausuntoPyynto);
        tiedostot.push({ tiedostot: lausuntoPyynto.lisaAineistot, paths, pathInDBProjekti: `lausuntoPyynnot.${index}.lisaAineistot` });
        return tiedostot;
      }, [] as LadattuTiedostoPathsPair[]) || []
    );
  }

  getAineistot(): AineistoPathsPair[] {
    return [];
  }
}
