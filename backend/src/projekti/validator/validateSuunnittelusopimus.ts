import { DBProjekti } from "../../database/model";
import { Projekti, ProjektiTyyppi, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { isAllowedToChangeSuunnittelusopimus } from "hassu-common/util/operationValidators";

export function validateSuunnitteluSopimus(dbProjekti: DBProjekti, projekti: Projekti, input: TallennaProjektiInput) {
  const suunnitteluSopimusAfterSaving: boolean =
    !!input.suunnitteluSopimus || !!(input.suunnitteluSopimus === undefined && dbProjekti.suunnitteluSopimus);
  const vahainenMenettelyAfterSaving: boolean =
    !!input.vahainenMenettely || !!(input.vahainenMenettely === undefined && !!dbProjekti.vahainenMenettely);

  if (
    suunnitteluSopimusAfterSaving &&
    (dbProjekti.velho?.tyyppi === ProjektiTyyppi.RATA || dbProjekti.velho?.tyyppi === ProjektiTyyppi.YLEINEN)
  ) {
    throw new IllegalArgumentError("Yleissuunnitelmalla ja ratasuunnitelmalla ei voi olla suunnittelusopimusta");
  }

  if (vahainenMenettelyAfterSaving && suunnitteluSopimusAfterSaving) {
    throw new IllegalArgumentError("Vähäisen menettelyn projektilla ei voi olla suunnittelusopimusta");
  }
  const isSuunnitteluSopimusAddedOrDeleted =
    (input.suunnitteluSopimus === null && !!dbProjekti.suunnitteluSopimus) ||
    (!!input.suunnitteluSopimus && !dbProjekti.suunnitteluSopimus);

  const allowedToChangeSuunnittelusopimus = isAllowedToChangeSuunnittelusopimus(projekti);

  if (isSuunnitteluSopimusAddedOrDeleted && !allowedToChangeSuunnittelusopimus) {
    throw new IllegalArgumentError(
      "Suunnittelusopimuksen olemassaoloa ei voi muuttaa, jos ensimmäinen HASSUssa tehty vaihe ei ole muokkaustilassa."
    );
  }
}
