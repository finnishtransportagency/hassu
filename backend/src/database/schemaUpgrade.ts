import { DBProjekti, IlmoituksenVastaanottajat } from "./model";
import { cloneDeepWith } from "lodash";
import { kuntametadata } from "../../../common/kuntametadata";
import { log } from "../logger";
import isArray from "lodash/isArray";

function isValueArrayOfStrings(value: unknown) {
  return isArray(value) && value.length > 0 && typeof value[0] == "string";
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
      if (isValueArrayOfStrings(value)) {
        try {
          return kuntametadata.idsForKuntaNames(value);
        } catch (e) {
          log.warn(e);
          return [];
        }
      }
    }
    if (key == "maakunnat") {
      if (isValueArrayOfStrings(value)) {
        try {
          return kuntametadata.idsForMaakuntaNames(value);
        } catch (e) {
          return [];
        }
      }
    }
    if (key == "ilmoituksenVastaanottajat") {
      const ilmoituksenVastaanottajat: IlmoituksenVastaanottajat = value;
      if (ilmoituksenVastaanottajat.kunnat && ilmoituksenVastaanottajat.kunnat.length > 0) {
        ilmoituksenVastaanottajat.kunnat.forEach((kunta) => {
          if ("nimi" in kunta) {
            kunta.id = kuntametadata.idForKuntaName((kunta as unknown as Record<string, string>).nimi);
          }
        });
        return ilmoituksenVastaanottajat;
      }
    }
    return undefined;
  });
}
