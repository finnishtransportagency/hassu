import { TiedostoManager, AineistoPathsPair } from ".";
import { LausuntoPyynnonTaydennys } from "../../database/model";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";

export class LausuntoPyynnonTaydennyksetTiedostoManager extends TiedostoManager<LausuntoPyynnonTaydennys[]> {
  getAineistot(vaihe: LausuntoPyynnonTaydennys[]): AineistoPathsPair[] {
    return vaihe.reduce((aineistoPathsPairs, lausuntoPyynnonTaydennys) => {
      aineistoPathsPairs = aineistoPathsPairs.concat(this.getAineisto(lausuntoPyynnonTaydennys));
      return aineistoPathsPairs;
    }, [] as AineistoPathsPair[]);
  }

  private getAineisto(_lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys): AineistoPathsPair[] {
    return [];
  }

  getLadatutTiedostot(vaihe: LausuntoPyynnonTaydennys[]): LadattuTiedostoPathsPair[] {
    return (
      vaihe.reduce((tiedostot, lausuntoPyynnonTaydennys, index) => {
        const paths = this.projektiPaths.lausuntoPyynnonTaydennys(lausuntoPyynnonTaydennys);
        tiedostot.push({
          tiedostot: lausuntoPyynnonTaydennys.muistutukset,
          paths,
          pathInDBProjekti: `lausuntoPyynnonTaydennykset.${index}.muistutukset`,
        });
        tiedostot.push({
          tiedostot: lausuntoPyynnonTaydennys.muuAineisto,
          paths,
          pathInDBProjekti: `lausuntoPyynnonTaydennykset.${index}.muuAineisto`,
        });
        return tiedostot;
      }, [] as LadattuTiedostoPathsPair[]) || []
    );
  }
}
