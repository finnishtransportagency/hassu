import * as API from "hassu-common/graphql/apiModel";
import orderBy from "lodash/orderBy";
import { adaptTiedoteInput, adaptTiedotteetToAPI } from "./tiedoteAdapter";
import { tiedoteDatabase } from "../../database/tiedoteDatabase";
import { requirePermissionLuku } from "../../user";
import { log, setLogContextOid } from "../../logger";

class TiedoteHandler {
  //lisää tänne yhden tiedotteen haku tiedotteen näyttämistä varten?

  async listaaTiedotteet(): Promise<API.Tiedote[] | undefined> {
    requirePermissionLuku();
    log.info("listaaTiedotteet");
    const tiedotteet = (await tiedoteDatabase.haeKaikkiTiedotteet()) ?? [];
    if (tiedotteet.length === 0) {
      return [];
    }
    let apiTiedotteet = adaptTiedotteetToAPI(tiedotteet);
    if (apiTiedotteet) {
      apiTiedotteet = orderBy(apiTiedotteet, ["voimassaAlkaen"], ["desc"]);
    }
    return apiTiedotteet;
  }

  async tallennaTiedote(id: string, tiedotteet: API.TiedoteInput[], poistettavatTiedotteet: string[]): Promise<string[]> {
    setLogContextOid(id);
    log.info("tallennaTiedote");

    const tulokset: string[] = [];

    for (const tiedoteId of poistettavatTiedotteet) {
      await tiedoteDatabase.poistaTiedoteById(tiedoteId);
      tulokset.push(`Poistettu: ${tiedoteId}`);
    }

    for (const tiedoteInput of tiedotteet) {
      const tiedoteData = adaptTiedoteInput(tiedoteInput);
      await tiedoteDatabase.tallennaTiedote(tiedoteData);
      tulokset.push(`Tallennettu: ${tiedoteData.id}`);
    }

    return tulokset;
  }
}

export const tiedoteHandler = new TiedoteHandler();
