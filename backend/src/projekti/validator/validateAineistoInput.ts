import { AineistoInput, AineistoTila } from "hassu-common/graphql/apiModel";
import { Aineisto } from "../../database/model";
import { IllegalArgumentError } from "hassu-common/error";

export function validateAineistoInput(dbAineistot: Aineisto[] | undefined | null, inputAineistot: AineistoInput[] | undefined | null) {
  if (
    dbAineistot &&
    inputAineistot !== undefined &&
    !dbAineistot.every(
      (dbaineisto) =>
        dbaineisto.tila == AineistoTila.ODOTTAA_POISTOA || inputAineistot?.find((inputaineisto) => inputaineisto.uuid == dbaineisto.uuid)
    )
  ) {
    throw new IllegalArgumentError("Jokainen db:ssä oleva aineisto on mainittava inputissa.");
  }
  if (
    inputAineistot &&
    inputAineistot.some((tiedosto) => inputAineistot.filter((tiedosto2) => tiedosto2.uuid == tiedosto.uuid).length > 1)
  ) {
    throw new IllegalArgumentError("Kahdella aineistolla ei voi olla samaa uuid:ta inputissa.");
  }
}
