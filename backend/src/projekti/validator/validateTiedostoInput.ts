import { LadattuTiedostoInput, LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { LadattuTiedosto } from "../../database/model";

export function validateTiedostoInput(
  dbTiedostot: LadattuTiedosto[] | undefined | null,
  inputTiedostot: LadattuTiedostoInput[] | undefined | null
) {
  if (
    dbTiedostot &&
    inputTiedostot !== undefined &&
    !dbTiedostot.every(
      (dbtiedosto) =>
        dbtiedosto.tila == LadattuTiedostoTila.ODOTTAA_POISTOA ||
        inputTiedostot?.find((inputtiedosto) => inputtiedosto.uuid == dbtiedosto.uuid)
    )
  ) {
    throw new IllegalArgumentError("Jokainen db:ssä oleva tiedosto on mainittava inputissa.");
  }
  if (
    inputTiedostot &&
    inputTiedostot.some((tiedosto) => inputTiedostot.filter((tiedosto2) => tiedosto2.uuid == tiedosto.uuid).length > 1)
  ) {
    throw new IllegalArgumentError("Kahdella tiedostolla ei voi olla samaa uuid:ta inputissa.");
  }
}
