import { AineistoPathsPair, handleAineistot } from ".";
import { LadattuTiedosto } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { AineistoTila } from "hassu-common/graphql/apiModel";

export abstract class AineistoManager<T> {
  public readonly oid: string;
  public readonly vaihe: T | undefined;
  public readonly projektiPaths: ProjektiPaths;

  constructor(oid: string, vaihe: T | undefined | null) {
    this.oid = oid;
    this.vaihe = vaihe || undefined;
    this.projektiPaths = new ProjektiPaths(oid);
  }

  async handleChanges(): Promise<T | undefined> {
    if (this.vaihe) {
      let changes = false;
      for (const element of this.getAineistot(this.vaihe)) {
        changes = (await handleAineistot(this.oid, element.aineisto, element.paths)) || changes;
      }
      if (changes) {
        return this.vaihe;
      }
    }
  }

  abstract getAineistot(vaihe: T): AineistoPathsPair[];

  abstract getLadatutTiedostot(vaihe: T): LadattuTiedosto[];

  isReady(): boolean {
    function hasAllAineistoValmis(element: AineistoPathsPair): boolean {
      if (!element.aineisto) {
        return true;
      }
      return element.aineisto?.every((a) => a.tila == AineistoTila.VALMIS);
    }

    let ready = true;
    if (this.vaihe) {
      const aineistot = this.getAineistot(this.vaihe);
      for (const element of aineistot) {
        const tmp = hasAllAineistoValmis(element);
        ready = ready && tmp;
      }

      const ladatutTiedostot = this.getLadatutTiedostot(this.vaihe);
      for (const ladattuTiedosto of ladatutTiedostot) {
        ready = ready && !!ladattuTiedosto.tuotu;
      }
    }
    return ready;
  }
}
