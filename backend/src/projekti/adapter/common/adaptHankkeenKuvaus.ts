import { LocalizedMap } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";

export function adaptHankkeenKuvaus(hankkeenKuvaus: LocalizedMap<string>): API.HankkeenKuvaukset | undefined {
  if (hankkeenKuvaus && Object.keys(hankkeenKuvaus).length > 0) {
    const kuvausSuomi = hankkeenKuvaus[API.Kieli.SUOMI];
    if (!kuvausSuomi) {
      throw new Error(`adaptHankkeenKuvaus: hankkeenKuvaus.${API.Kieli.SUOMI} puuttuu`);
    }
    return {
      __typename: "HankkeenKuvaukset",
      [API.Kieli.SUOMI]: kuvausSuomi,
      ...hankkeenKuvaus,
    };
  }
}

export function adaptHankkeenKuvausToSave(hankkeenKuvaus: API.HankkeenKuvauksetInput): LocalizedMap<string> {
  const kuvaus: LocalizedMap<string> = { [API.Kieli.SUOMI]: hankkeenKuvaus[API.Kieli.SUOMI] };
  Object.keys(API.Kieli).forEach((kieli) => {
    if (hankkeenKuvaus[kieli as API.Kieli]) {
      kuvaus[kieli as API.Kieli] = hankkeenKuvaus[kieli as API.Kieli] || undefined;
    }
  });
  return kuvaus;
}
