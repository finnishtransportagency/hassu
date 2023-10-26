import { AineistoManager, AineistoPathsPair } from ".";
import { LadattuTiedosto, LausuntoPyynto } from "../../database/model";

export class LausuntoPyyntoAineisto extends AineistoManager<LausuntoPyynto[]> {
  getAineistot(vaihe: LausuntoPyynto[]): AineistoPathsPair[] {
    return vaihe.map((lausuntoPyynto) => ({
      paths: this.projektiPaths.lausuntoPyynto(lausuntoPyynto),
      aineisto: lausuntoPyynto.lisaAineistot,
    }));
  }
  getLadatutTiedostot(_vaihe: LausuntoPyynto[]): LadattuTiedosto[] {
    return []; //Lausuntopyyntöihin ei liity muista tiedostoja kuin lisäaineistot
  }

  async handleChanges(): Promise<LausuntoPyynto[] | undefined> {
    const vaihe = await super.handleChanges();
    return vaihe?.filter((lausuntoPyynto: LausuntoPyynto) => !lausuntoPyynto.poistetaan);
  }
}
