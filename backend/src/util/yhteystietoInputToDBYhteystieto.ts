import { YhteystietoInput } from "hassu-common/graphql/apiModel";
import { Yhteystieto } from "../database/model";

export function yhteystietoInputToDBYhteystieto({
  etunimi,
  puhelinnumero,
  sahkoposti,
  sukunimi,
  kunta,
  organisaatio,
  titteli,
}: YhteystietoInput): Yhteystieto {
  return {
    etunimi,
    puhelinnumero,
    sahkoposti,
    sukunimi,
    kunta: kunta ?? undefined,
    organisaatio: organisaatio ?? "",
    titteli: titteli ?? undefined,
  };
}
