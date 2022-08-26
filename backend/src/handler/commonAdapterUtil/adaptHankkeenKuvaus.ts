import { LocalizedMap } from "../../database/model";
import * as API from "../../../../common/graphql/apiModel";

export function adaptHankkeenKuvaus(hankkeenKuvaus: LocalizedMap<string>): API.HankkeenKuvaukset {
  if (hankkeenKuvaus && Object.keys(hankkeenKuvaus).length > 0) {
    return {
      __typename: "HankkeenKuvaukset",
      SUOMI: hankkeenKuvaus?.SUOMI,
      ...hankkeenKuvaus,
    };
  }
}
