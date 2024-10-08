import { AineistoPathsPair, handleAineistot, handleTiedostot } from ".";
import { ProjektiPaths, SisainenProjektiPaths } from "../../files/ProjektiPath";
import { AineistoTila, LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";

export abstract class TiedostoManager<T> {
  public readonly oid: string;
  public readonly vaihe: T | undefined;
  public readonly projektiPaths: ProjektiPaths;
  public readonly sisainenProjektiPaths: SisainenProjektiPaths;

  constructor(oid: string, vaihe: T | undefined | null) {
    this.oid = oid;
    this.vaihe = vaihe ?? undefined;
    this.projektiPaths = new ProjektiPaths(oid);
    this.sisainenProjektiPaths = new SisainenProjektiPaths(oid);
  }

  async handleChanges(): Promise<T | undefined> {
    if (this.vaihe) {
      let changes = false;
      // Aineistot, joita saadaan ulos this.getAineistot():sta, on sellaisia, että this.vaihe yhä viittaa niihin.
      for (const element of this.getAineistot(this.vaihe)) {
        // Tämä taikafunktio handlaa aineistot siten, että this.vaihe:een sisältö muuttuu sellaiseksi, jossa aineistot on merkitty käsitellyksi.
        changes = (await handleAineistot(this.oid, element.aineisto, element.paths)) || changes;
      }
      if (changes) {
        return this.vaihe;
      }
    }
  }

  async handleChangedTiedostot(): Promise<T | undefined> {
    if (this.vaihe) {
      let changes = false;
      // Tiedostot, joita saadaan ulos this.getLadatutTiedostot():sta, on sellaisia, että this.vaihe yhä viittaa niihin.
      for (const element of this.getLadatutTiedostot(this.vaihe)) {
        // Tämä taikafunktio handlaa tiedotot siten, että this.vaihe:een sisältö muuttuu sellaiseksi,
        // jossa poistettavat tiedotot on poistettu ja persistoitavat peristoitu ja merkitty valmiiksi.
        const changesInThisElement = await handleTiedostot(this.oid, element.tiedostot, element.paths);
        changes = changes || changesInThisElement;
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
      return element.tiedostot?.every((a) => a.tila == LadattuTiedostoTila.VALMIS);
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
