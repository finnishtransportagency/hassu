import { LocalizedMap } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";

export function adaptLokalisoituTekstiToAPI(lokalisoituTeksti: LocalizedMap<string> | undefined): API.LokalisoituTeksti | undefined {
  if (lokalisoituTeksti && Object.keys(lokalisoituTeksti).length > 0) {
    return {
      __typename: "LokalisoituTeksti",
      [API.Kieli.SUOMI]: lokalisoituTeksti[API.Kieli.SUOMI] ?? "",
      ...lokalisoituTeksti,
    };
  }
}
