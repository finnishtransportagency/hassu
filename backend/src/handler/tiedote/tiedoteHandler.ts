import * as API from "hassu-common/graphql/apiModel";
import orderBy from "lodash/orderBy";
import { adaptTiedoteInput, adaptTiedotteetToAPI } from "./tiedoteAdapter";
import { DBTiedote, tiedoteDatabase } from "../../database/tiedoteDatabase";
import { log } from "../../logger";
import { TallennaTiedoteMutationVariables } from "hassu-common/graphql/apiModel";

class TiedoteHandler {
  async listaaTiedotteet(id?: string): Promise<API.Tiedote[] | undefined> {
    //requirePermissionLuku();
    log.info("listaaTiedotteet");
    let tiedotteet: DBTiedote[];
    if (id) {
      const tiedote = await tiedoteDatabase.haeTiedote(id);
      tiedotteet = tiedote ? [tiedote] : [];
    } else {
      tiedotteet = (await tiedoteDatabase.haeKaikkiTiedotteet()) ?? [];
    }

    if (tiedotteet.length === 0) {
      return [];
    }

    let apiTiedotteet = adaptTiedotteetToAPI(tiedotteet);
    if (apiTiedotteet) {
      apiTiedotteet = orderBy(apiTiedotteet, ["voimassaAlkaen"], ["desc"]);
    }
    return apiTiedotteet;
  }

  async listaaTiedotteetJulkinen(id?: string): Promise<API.Tiedote[] | undefined> {
    //requirePermissionLuku();
    log.info("listaaTiedotteetJulkinen");
    let tiedotteet: DBTiedote[];
    if (id) {
      const tiedote = await tiedoteDatabase.haeTiedote(id);
      tiedotteet = tiedote ? [tiedote] : [];
    } else {
      tiedotteet = (await tiedoteDatabase.haeKaikkiTiedotteet()) ?? [];
    }

    if (tiedotteet.length === 0) {
      return [];
    }

    let apiTiedotteet = adaptTiedotteetToAPI(tiedotteet);
    if (apiTiedotteet) {
      apiTiedotteet = orderBy(apiTiedotteet, ["voimassaAlkaen"], ["desc"]);
    }
    return apiTiedotteet;
  }

  async tallennaTiedote(input: TallennaTiedoteMutationVariables): Promise<string[]> {
    log.info("tallennaTiedote");

    const tulokset: string[] = [];

    for (const tiedoteId of input.poistettavatTiedotteet) {
      await tiedoteDatabase.poistaTiedoteById(tiedoteId);
      tulokset.push(`Poistettu: ${tiedoteId}`);
    }

    for (const tiedoteInput of input.tiedotteet) {
      const tiedoteData = adaptTiedoteInput(tiedoteInput);
      await tiedoteDatabase.tallennaTiedote({ ...tiedoteData, __typename: "Tiedote" });
      tulokset.push(`Tallennettu: ${tiedoteData.id}`);
    }

    return tulokset;
  }
}

export const tiedoteHandler = new TiedoteHandler();
