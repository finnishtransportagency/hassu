import { RequiredLocalizedMap } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";

export function adaptPakotettuLokalisoituTekstiToAPI(
  localizedMap: RequiredLocalizedMap<string> | undefined
): API.LokalisoituTeksti | null | undefined {
  if (localizedMap && Object.keys(localizedMap).length > 0) {
    return {
      __typename: "LokalisoituTeksti",
      ...localizedMap,
      [API.Kieli.SUOMI]: localizedMap[API.Kieli.SUOMI] || "",
    };
  }
}
