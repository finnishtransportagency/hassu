import * as API from "hassu-common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../../projektiAdaptationResult";
import { LocalizedMap } from "../../../../database/model";

export function adaptLogoFilesToSave(
  alkuperaisetArvot?: LocalizedMap<string>,
  lokalisoituTekstiEiPakollinen?: API.LokalisoituTekstiInputEiPakollinen | null,
  projektiAdaptationResult?: ProjektiAdaptationResult
): LocalizedMap<string> | null | undefined {
  if (lokalisoituTekstiEiPakollinen) {
    const { SUOMI, RUOTSI, ...rest } = lokalisoituTekstiEiPakollinen;
    if (lokalisoituTekstiEiPakollinen?.SUOMI || lokalisoituTekstiEiPakollinen?.RUOTSI) {
      projektiAdaptationResult?.logoFilesChanged();
    }
    return { ...rest, SUOMI: SUOMI ?? alkuperaisetArvot?.SUOMI ?? "", RUOTSI: RUOTSI ?? alkuperaisetArvot?.RUOTSI };
  }
  return lokalisoituTekstiEiPakollinen;
}
