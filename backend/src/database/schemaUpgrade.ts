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
      try {
        return kuntametadata.idForKuntaName(value);
      } catch (e) {
        return 0;
      }
    }
    if (key == "kunnat") {
      if (isValueArrayOfStringsOrNumbers(value)) {
        try {
          return kuntametadata.idsForKuntaNames(value);
        } catch (e) {
          return [];
        }
      }
    }
    if (key == "maakunnat") {
      if (isValueArrayOfStringsOrNumbers(value)) {
        try {
          return kuntametadata.idsForMaakuntaNames(value);
        } catch (e) {
          return [];
        }
      }
    }
    return undefined;
  });
}
