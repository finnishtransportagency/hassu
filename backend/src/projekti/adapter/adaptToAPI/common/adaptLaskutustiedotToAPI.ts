import * as API from "hassu-common/graphql/apiModel";
import { Laskutustiedot } from "../../../../database/model";

export function adaptLaskutustiedotToAPI(laskutustiedot: Laskutustiedot | null | undefined): API.Laskutustiedot | null | undefined {
  if (!laskutustiedot) {
    return laskutustiedot;
  }
  return {
    __typename: "Laskutustiedot",
    ...laskutustiedot,
  };
}
