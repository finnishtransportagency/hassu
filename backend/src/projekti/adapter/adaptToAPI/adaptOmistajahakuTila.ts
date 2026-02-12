import { DBProjektiSlim } from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { nyt, parseDate } from "../../../util/dateUtil";

export function adaptOmistajahakuTila(projektiFromDB: DBProjektiSlim | undefined): API.OmistajahakuTila {
  if (projektiFromDB?.omistajahaku?.virhe) {
    return API.OmistajahakuTila.VIRHE;
  } else if (hasHakuTimeouted(projektiFromDB?.omistajahaku?.kaynnistetty)) {
    return API.OmistajahakuTila.VIRHE_AIKAKATKAISU;
  } else if (projektiFromDB?.omistajahaku?.kaynnistetty) {
    return API.OmistajahakuTila.KAYNNISSA;
  } else {
    return API.OmistajahakuTila.VALMIS;
  }
}

function hasHakuTimeouted(omistajahakuKaynnistetty: string | undefined | null): boolean | undefined {
  return !!omistajahakuKaynnistetty && nyt().diff(parseDate(omistajahakuKaynnistetty), "minutes") >= 10;
}
