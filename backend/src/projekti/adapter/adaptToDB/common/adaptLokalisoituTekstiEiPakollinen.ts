import * as API from "hassu-common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../../projektiAdaptationResult";
import { LocalizedMap } from "../../../../database/model";

export function adaptLokalisoituTekstiEiPakollinen(
  alkuperaisetArvot?: LocalizedMap<string>,
  lokalisoituTekstiEiPakollinen?: API.LokalisoituTekstiInputEiPakollinen | null,
  projektiAdaptationResult?: ProjektiAdaptationResult
): API.LokalisoituTekstiInput | null | undefined {
  if (lokalisoituTekstiEiPakollinen) {
    const { SUOMI, RUOTSI, ...rest } = lokalisoituTekstiEiPakollinen;
    if (lokalisoituTekstiEiPakollinen?.SUOMI || lokalisoituTekstiEiPakollinen?.RUOTSI) {
      projektiAdaptationResult?.logoFilesChanged();
    }
    return { ...rest, SUOMI: SUOMI ?? alkuperaisetArvot?.SUOMI ?? "", RUOTSI: RUOTSI ?? alkuperaisetArvot?.RUOTSI };
  }
  return lokalisoituTekstiEiPakollinen;
}
