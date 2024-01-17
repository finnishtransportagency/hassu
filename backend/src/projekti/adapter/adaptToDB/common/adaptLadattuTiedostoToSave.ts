import { LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { LadattuTiedosto } from "../../../../database/model";
import { uuid } from "hassu-common/util/uuid";

export function adaptLadattuTiedostoToSave(
  dbLadattuTiedosto: LadattuTiedosto | null | undefined,
  inputTiedostoPath: string | null | undefined
): LadattuTiedosto | undefined | null {
  if (inputTiedostoPath == null) {
    if (dbLadattuTiedosto) {
      return {
        ...dbLadattuTiedosto,
        tila: LadattuTiedostoTila.ODOTTAA_POISTOA,
      };
    }
  }
  if (inputTiedostoPath) {
    // Jos APIin lähetetty absoluuttinen polku ei osoita samaan tiedostoon joka on ladattu, korvataan se
    if (!dbLadattuTiedosto || !inputTiedostoPath.endsWith(dbLadattuTiedosto.tiedosto)) {
      return { uuid: uuid.v4(), tiedosto: inputTiedostoPath, tila: LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA };
    }
  }
  return dbLadattuTiedosto;
}
