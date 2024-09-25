import { Palaute } from "../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { localDateTimeString } from "../util/dateUtil";
import { uuid } from "hassu-common/util/uuid";

export function adaptPalauteInput(oid: string, palaute: API.PalauteInput): Palaute {
  const aikaleima = localDateTimeString();
  return { ...palaute, vastaanotettu: aikaleima, oid, id: uuid.v4() };
}

export function adaptPalautteetToAPI(palautteet: Palaute[]): API.Palaute[] | undefined {
  if (palautteet) {
    return palautteet.map((palaute) => {
      if (palaute.liite) {
        palaute.liitteet = [palaute.liite];
      }
      return { __typename: "Palaute", ...palaute };
    });
  }
}
