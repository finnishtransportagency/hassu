import { AineistoInput, AineistoTila } from "hassu-common/graphql/apiModel";
import { Aineisto } from "../../database/model";
import { IllegalArgumentError } from "hassu-common/error";

export function validateAineistoInput(dbAineistot: Aineisto[] | undefined | null, inputAineistot: AineistoInput[] | undefined | null) {
  const dbTiedostoJotaEiMainitaInputissa = dbAineistot?.find(
    (dbaineisto) =>
      dbaineisto.tila != AineistoTila.ODOTTAA_POISTOA && !inputAineistot?.find((inputaineisto) => inputaineisto.uuid == dbaineisto.uuid)
  );
  if (dbAineistot && inputAineistot !== undefined && dbTiedostoJotaEiMainitaInputissa) {
    throw new IllegalArgumentError(
      `Jokainen db:ssä oleva aineisto on mainittava inputissa. Puuttuu: ${dbTiedostoJotaEiMainitaInputissa?.uuid}`
    );
  }
  if (
    inputAineistot &&
    inputAineistot.some((aineisto) => inputAineistot.filter((aineisto2) => aineisto2.uuid == aineisto.uuid).length > 1)
  ) {
    throw new IllegalArgumentError("Kahdella aineistolla ei voi olla samaa uuid:ta inputissa.");
  }
  const dbAineistoJokaMuutettuInputissaValmiiksi = dbAineistot?.find((dbaineisto) => {
    const inputVastine = inputAineistot?.find((inputaineisto) => inputaineisto.uuid == dbaineisto.uuid);
    return inputVastine && dbaineisto.tila != AineistoTila.VALMIS && inputVastine.tila == AineistoTila.VALMIS;
  });
  if (dbAineistot && inputAineistot !== undefined && dbAineistoJokaMuutettuInputissaValmiiksi) {
    throw new IllegalArgumentError(
      `Inputissa on merkitty sellainen aineisto valmiiksi, joka ei ole valmis. Sen uuid on ${dbAineistoJokaMuutettuInputissaValmiiksi.uuid}`
    );
  }
}
