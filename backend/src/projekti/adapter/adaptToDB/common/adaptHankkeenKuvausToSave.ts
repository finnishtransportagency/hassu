import * as API from "hassu-common/graphql/apiModel";
import { LocalizedMap } from "../../../../database/model";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

export function adaptHankkeenKuvausToSave(
  hankkeenKuvaus: API.LokalisoituTekstiInput | undefined | null
): LocalizedMap<string> | undefined | null {
  if (!hankkeenKuvaus) {
    return hankkeenKuvaus;
  }
  const kuvausSuomi = hankkeenKuvaus[API.Kieli.SUOMI];
  if (!kuvausSuomi) {
    throw new Error(`adaptHankkeenKuvaus: hankkeenKuvaus.${API.Kieli.SUOMI} puuttuu`);
  }
  const kuvaus: LocalizedMap<string> = { [API.Kieli.SUOMI]: hankkeenKuvaus[API.Kieli.SUOMI] };
  Object.keys(API.Kieli).forEach((kieli) => {
    if (hankkeenKuvaus[kieli as KaannettavaKieli]) {
      kuvaus[kieli as API.Kieli] = hankkeenKuvaus[kieli as KaannettavaKieli] || undefined;
    }
  });
  return kuvaus;
}
