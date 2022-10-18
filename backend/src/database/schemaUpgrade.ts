import { DBProjekti } from "./model";
import { cloneDeepWith } from "lodash";
import { kuntametadata } from "../../../common/kuntametadata";

function isValueArrayOfStringsOrNumbers(value: unknown) {
  return value instanceof Array && value.length > 0 && (typeof value[0] == "string" || typeof value[0] == "number");
}

/**
 * Konvertoi merkkijonomuotoiset kunnat ja maakunnat numeroiksi
 * @param projekti
 */
export function migrateFromOldSchema(projekti: DBProjekti): DBProjekti {
  return cloneDeepWith(projekti, (value, key) => {
    if (key == "kunta") {
      return kuntametadata.idForKuntaName(value);
    }
    if (key == "kunnat") {
      if (isValueArrayOfStringsOrNumbers(value)) {
        return kuntametadata.idsForKuntaNames(value);
      }
    }
    if (key == "maakunnat") {
      if (isValueArrayOfStringsOrNumbers(value)) {
        return kuntametadata.idsForMaakuntaNames(value);
      }
    }
    return value;
  });
}
