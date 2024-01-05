import { DBProjekti } from "../../database/model";
import { Projekti, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { isAllowedToChangeEuRahoitus } from "hassu-common/util/operationValidators";

export function validateEuRahoitus(dbProjekti: DBProjekti, projekti: Projekti, input: TallennaProjektiInput) {
  const isEuSopimusAddedOrDeleted =
    ((input.euRahoitus === null || input.euRahoitus === false) && !!dbProjekti.euRahoitus) ||
    (!!input.euRahoitus && !dbProjekti.euRahoitus);

  const allowedToChangeEuSopimus = isAllowedToChangeEuRahoitus(projekti);

  if (isEuSopimusAddedOrDeleted && !allowedToChangeEuSopimus) {
    throw new IllegalArgumentError(
      "EU-rahoituksen olemassaoloa ei voi muuttaa, jos ensimmäinen HASSUssa tehty vaihe ei ole muokkaustilassa."
    );
  }
}
