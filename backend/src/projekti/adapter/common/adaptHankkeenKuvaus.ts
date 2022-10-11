import { LocalizedMap } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";

export function adaptHankkeenKuvaus(hankkeenKuvaus: LocalizedMap<string>): API.HankkeenKuvaukset | undefined {
  if (hankkeenKuvaus && Object.keys(hankkeenKuvaus).length > 0) {
    return {
      __typename: "HankkeenKuvaukset",
      [API.Kieli.SUOMI]: hankkeenKuvaus[API.Kieli.SUOMI] || "",
      ...hankkeenKuvaus,
    };
  }
}
