import { AineistoManager, AineistoPathsPair } from ".";
import { LadattuTiedosto, LausuntoPyynnonTaydennys } from "../../database/model";

export class LausuntoPyynnonTaydennyksetAineisto extends AineistoManager<LausuntoPyynnonTaydennys[]> {
  getAineistot(vaihe: LausuntoPyynnonTaydennys[]): AineistoPathsPair[] {
    return vaihe.reduce((aineistoPathsPairs, lausuntoPyynnonTaydennys) => {
      aineistoPathsPairs.push({
        paths: this.projektiPaths.lausuntoPyynnonTaydennys(lausuntoPyynnonTaydennys),
        aineisto: lausuntoPyynnonTaydennys.muuAineisto,
      });
      aineistoPathsPairs.push({
        paths: this.projektiPaths.lausuntoPyynnonTaydennys(lausuntoPyynnonTaydennys),
        aineisto: lausuntoPyynnonTaydennys.muistutukset,
      });
      return aineistoPathsPairs;
    }, [] as AineistoPathsPair[]);
  }
  getLadatutTiedostot(_vaihe: LausuntoPyynnonTaydennys[]): LadattuTiedosto[] {
    return []; //Lausuntopyynnön täydennyksiin ei liity muista tiedostoja kuin muut aineistot
  }

  async handleChanges(): Promise<LausuntoPyynnonTaydennys[] | undefined> {
    const vaihe = await super.handleChanges();
    return vaihe?.filter((lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys) => !lausuntoPyynnonTaydennys.poistetaan);
  }
}
