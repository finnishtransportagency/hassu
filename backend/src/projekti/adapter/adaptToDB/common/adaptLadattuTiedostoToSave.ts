import { LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { LadattuTiedosto } from "../../../../database/model";
import { uuid } from "hassu-common/util/uuid";

export function adaptLadattuTiedostoToSave(
  dbLadattuTiedosto: LadattuTiedosto | null | undefined,
  inputTiedostoPath: string | null | undefined
): LadattuTiedosto | undefined | null {
  if (inputTiedostoPath == null) {
    if (dbLadattuTiedosto) {
      dbLadattuTiedosto.nimi = null;
    }
  }
  if (inputTiedostoPath) {
    if (!dbLadattuTiedosto) {
      dbLadattuTiedosto = { uuid: uuid.v4(), tiedosto: inputTiedostoPath, tila: LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA };
    } else if (!inputTiedostoPath.endsWith(dbLadattuTiedosto.tiedosto)) {
      // Jos APIin lähetetty absoluuttinen polku ei osoita samaan tiedostoon joka on ladattu, korvataan se
      dbLadattuTiedosto.tiedosto = inputTiedostoPath;
      dbLadattuTiedosto.tuotu = undefined;
      dbLadattuTiedosto.nimi = undefined;
    }
  }
  return dbLadattuTiedosto;
}
