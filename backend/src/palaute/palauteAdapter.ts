import { Palaute } from "../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { localDateTimeString } from "../util/dateUtil";
import { uuid } from "hassu-common/util/uuid";

export function adaptPalauteInput(oid: string, palaute: API.PalauteInput): Palaute & { liitteet: string[] } {
  const aikaleima = localDateTimeString();
  return { ...palaute, vastaanotettu: aikaleima, oid, id: uuid.v4(), liitteet: palaute.liitteet ?? [] };
}

export function adaptPalautteetToAPI(palautteet: Palaute[]): API.Palaute[] | undefined {
  if (palautteet) {
    return palautteet.map((palaute) => {
      if (palaute.liite) {
        palaute.liitteet = [palaute.liite];
      }
      return { __typename: "Palaute", ...palaute, "liitteet": palaute.liitteet?.map((liite) => ({ __typename: "Liite", liite })) };
    });
  }
}
