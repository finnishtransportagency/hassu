import { Projekti, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";

export function validateAsianhallinnanAktivointikytkin(projekti: Projekti, input: TallennaProjektiInput) {
  if (!projekti.asianhallinta.aktivoitavissa && (Object.keys(input) as (keyof TallennaProjektiInput)[]).includes("asianhallinta")) {
    throw new IllegalArgumentError(
      "Ei voi muokata salliAsianHallintaIntegraatio-tietoa, koska suunnittelusta vastaava viranomainen ei ole Väylävirasto"
    );
  }
}
