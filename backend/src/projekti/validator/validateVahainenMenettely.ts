import { DBProjekti } from "../../database/model";
import { Projekti, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { isAllowedToChangeVahainenMenettely } from "hassu-common/util/operationValidators";

export function validateVahainenMenettely(dbProjekti: DBProjekti, projekti: Projekti, input: TallennaProjektiInput) {
  const vahainenMenettelyAfterSaving: boolean =
    input.vahainenMenettely === true || (input.vahainenMenettely === undefined && dbProjekti.vahainenMenettely === true);
  const suunnitteluSopimusAfterSaving: boolean =
    !!input.suunnitteluSopimus || !!(input.suunnitteluSopimus === undefined && dbProjekti.suunnitteluSopimus);

  if (vahainenMenettelyAfterSaving && suunnitteluSopimusAfterSaving) {
    throw new IllegalArgumentError("Projekteilla, joihin sovelletaan vähäistä menettelyä, ei voi olla suunnittelusopimusta.");
  }

  const isVahainenMenettelyValueChanged =
    typeof input.vahainenMenettely === "boolean" && !!input.vahainenMenettely !== !!dbProjekti.vahainenMenettely;

  const allowedToChangeVahainenMenettely = isAllowedToChangeVahainenMenettely(projekti);
  if (isVahainenMenettelyValueChanged && !allowedToChangeVahainenMenettely) {
    throw new IllegalArgumentError(
      "Vähäisen menettelyn olemassaoloa ei voi muuttaa, jos ensimmäinen HASSUssa tehty vaihe ei ole muokkaustilassa."
    );
  }
}
