import * as API from "hassu-common/graphql/apiModel";
import { Tiedote } from "hassu-common/graphql/apiModel";
import { uuid } from "hassu-common/util/uuid";
import { DBTiedote } from "../../database/tiedoteDatabase";

type TiedoteData = Omit<Tiedote, "__typename">;

export function adaptTiedoteInput(tiedote: API.TiedoteInput): TiedoteData {
  return { ...tiedote, id: tiedote.id || uuid.v4(), muokattu: new Date().toISOString() };
}

export function adaptTiedotteetToAPI(tiedotteet: DBTiedote[]): API.Tiedote[] | undefined {
  return tiedotteet?.map((tiedote) => ({
    __typename: "Tiedote" as const,
    ...(tiedote as unknown as Omit<API.Tiedote, "__typename">),
  }));
}
