import { LadattuTiedostoInput, LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { LadattuTiedosto } from "../../database/model";

export function validateTiedostoInput(
  dbTiedostot: LadattuTiedosto[] | undefined | null,
  inputTiedostot: LadattuTiedostoInput[] | undefined | null
) {
  const dbTiedostoJotaEiMainitaInputissa = dbTiedostot?.find(
    (dbtiedosto) =>
      dbtiedosto.tila != LadattuTiedostoTila.ODOTTAA_POISTOA &&
      !inputTiedostot?.find((inputtiedosto) => inputtiedosto.uuid == dbtiedosto.uuid)
  );
  if (dbTiedostot && inputTiedostot !== undefined && dbTiedostoJotaEiMainitaInputissa) {
    throw new IllegalArgumentError(
      `Jokainen db:ssä oleva tiedosto on mainittava inputissa. Puuttuu: ${dbTiedostoJotaEiMainitaInputissa?.uuid}`
    );
  }
  if (
    inputTiedostot &&
    inputTiedostot.some((tiedosto) => inputTiedostot.filter((tiedosto2) => tiedosto2.uuid == tiedosto.uuid).length > 1)
  ) {
    throw new IllegalArgumentError("Kahdella tiedostolla ei voi olla samaa uuid:ta inputissa.");
  }
  const dbTiedostoJokaMuutettuInputissaValmiiksi = dbTiedostot?.find((dbtiedosto) => {
    const inputVastine = inputTiedostot?.find((inputtiedosto) => inputtiedosto.uuid == dbtiedosto.uuid);
    return inputVastine && dbtiedosto.tila != LadattuTiedostoTila.VALMIS && inputVastine.tila == LadattuTiedostoTila.VALMIS;
  });
  if (dbTiedostot && inputTiedostot !== undefined && dbTiedostoJokaMuutettuInputissaValmiiksi) {
    throw new IllegalArgumentError(
      `Inputissa on merkitty sellainen tiedosto valmiiksi, joka ei ole valmis. Sen uuid on ${dbTiedostoJokaMuutettuInputissaValmiiksi.uuid}`
    );
  }
}
