import { AineistoPathsPair, handleAineistot, handleTiedostot } from ".";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { AineistoTila, LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";
import { log } from "../../logger";

export abstract class TiedostoManager<T> {
  public readonly oid: string;
  public readonly vaihe: T | undefined;
  public readonly projektiPaths: ProjektiPaths;

  constructor(oid: string, vaihe: T | undefined | null) {
    this.oid = oid;
    this.vaihe = vaihe ?? undefined;
    this.projektiPaths = new ProjektiPaths(oid);
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
      // Tiedostot, joita saadaan ulos this.getLadatutTiedostot():sta, on sellaisia, että this.vaihe yhä viittaa niihin.
      const changesPromise = await Promise.all(
        this.getLadatutTiedostot(this.vaihe).map((element: LadattuTiedostoPathsPair) => {
          // Tämä taikafunktio handlaa tiedotot siten, että this.vaihe:een sisältö muuttuu sellaiseksi,
          // jossa poistettavat tiedotot on poistettu ja persistoitavat peristoitu ja merkitty valmiiksi.
          log.info("Handles tiedostot", element.tiedostot);
          return handleTiedostot(this.oid, element.tiedostot, element.paths);
        })
      );
      log.info("changesPromise", changesPromise);
      log.info("this.vaihe", this.vaihe);
      const changes = changesPromise.some((change) => change);
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
