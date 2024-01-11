import { AineistoPathsPair } from ".";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { AineistoTila, LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";

export abstract class TiedostoManager<T> {
  public readonly oid: string;
  public readonly vaihe: T | undefined;
  public readonly projektiPaths: ProjektiPaths;

  constructor(oid: string, vaihe: T | undefined | null) {
    this.oid = oid;
    this.vaihe = vaihe ?? undefined;
    this.projektiPaths = new ProjektiPaths(oid);
  }

  // On äärimmäisen tärkeää handleChanges()-funktion toiminnan kannnalta,
  // että tämän getAineistot-funktion jokainen implementaatio palauttaa aineistot vaiheesta kopioimatta niitä,
  // eli että tämän palauttamat aineistot ovat samat, kuin joihin parametrina annettu vaihe viittaa.
  // Myöhemmin nimittäin kyseisiin aineistoihin tehdään muutoksia ja halutaan, että kyseiset muutokset ovat
  // nähtävillä, kun tarkastellaan tuota parametrina annettuna vaihetta kutsumalla this.vaihe.
  abstract getAineistot(vaihe: T): AineistoPathsPair[];

  abstract getLadatutTiedostot(vaihe: T): LadattuTiedostoPathsPair[];

  isReady(): boolean {
    function hasAllAineistoValmis(element: AineistoPathsPair): boolean {
      if (!element.aineisto) {
        return true;
      }
      return element.aineisto?.every((a) => a.tila == AineistoTila.VALMIS);
    }

    function hasAllLadattuTiedostoValmis(element: LadattuTiedostoPathsPair): boolean {
      if (!element.tiedostot) {
        return true;
      }
      return element.tiedostot?.every((a) => a.tila == LadattuTiedostoTila.VALMIS || a.tiedosto);
    }

    let ready = true;
    if (this.vaihe) {
      const aineistot = this.getAineistot(this.vaihe);
      for (const element of aineistot) {
        const tmp = hasAllAineistoValmis(element);
        ready = ready && tmp;
      }

      const ladatutTiedostot = this.getLadatutTiedostot(this.vaihe);
      for (const element of ladatutTiedostot) {
        const tmp = hasAllLadattuTiedostoValmis(element);
        ready = ready && tmp;
      }
    }
    return ready;
  }
}
