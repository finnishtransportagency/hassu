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
        // Aineistot, joita saadaan ulos this.getAineistot():sta, on sellaisia, että this.vaihe yhä viittaa niihin.
        changes = (await handleAineistot(this.oid, element.aineisto, element.paths)) || changes;
        // Tämä taikafunktio handlaa aineistot siten, että this.vaihe:een sisältö muuttuu sellaiseksi, jossa aineistot on merkitty käsitellyksi.
      }
      if (changes) {
        return this.vaihe;
      }
    }
  }

  // On äärimmäisen tärkeää handleChanges()-funktion toiminnan kannnalta,
  // että tämän getAineistot-funktion jokainen implementaatio palauttaa aineistot vaiheesta kopioimatta niitä,
  // eli että tämän palauttamat aineistot ovat samat, kuin joihin parametrina annettu vaihe viittaa.
  // Myöhemmin nimittäin kyseisiin aineistoihin tehdään muutoksia ja halutaan, että kyseiset muutokset ovat
  // nähtävillä, kun tarkastellaan tuota parametrina annettuna vaihetta kutsumalla this.vaihe.
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
