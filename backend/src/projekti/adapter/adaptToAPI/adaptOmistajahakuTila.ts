import { DBProjekti } from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { nyt, parseDate } from "../../../util/dateUtil";

export function adaptOmistajahakuTila(projektiFromDB: DBProjekti | undefined): API.OmistajahakuTila {
  if (projektiFromDB?.omistajahakuVirhe) {
    return API.OmistajahakuTila.VIRHE;
  } else if (hasHakuTimeouted(projektiFromDB?.omistajahakuKaynnistetty)) {
    return API.OmistajahakuTila.VIRHE_AIKAKATKAISU;
  } else if (projektiFromDB?.omistajahakuKaynnistetty) {
    return API.OmistajahakuTila.KAYNNISSA;
  } else {
    return API.OmistajahakuTila.VALMIS;
  }
}

function hasHakuTimeouted(omistajahakuKaynnistetty: string | undefined): boolean | undefined {
  return !!omistajahakuKaynnistetty && nyt().diff(parseDate(omistajahakuKaynnistetty), "minutes") >= 10;
}
