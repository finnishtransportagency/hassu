import { Palaute } from "../database/model";
import * as API from "../../../common/graphql/apiModel";
import { uuid } from "../util/uuid";
import { localDateTimeString } from "../util/dateUtil";

export function adaptPalauteInput(oid: string, palaute: API.PalauteInput): Palaute {
  const aikaleima = localDateTimeString();
  return { ...palaute, vastaanotettu: aikaleima, oid, id: uuid.v4() };
}

export function adaptPalautteetToAPI(palautteet: Palaute[]): API.Palaute[] | undefined {
  if (palautteet) {
    return palautteet.map((palaute) => ({ __typename: "Palaute", ...palaute }));
  }
}
