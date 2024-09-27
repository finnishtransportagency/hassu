import { DBProjekti } from "../../database/model";
import { Kieli, Projekti, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { viimeisinTilaOnMigraatio } from "hassu-common/util/tilaUtils";
import { isAllowedToChangeKielivalinta } from "hassu-common/util/operationValidators";

function kieltaEiMuuteta(inputKieli: Kieli | null | undefined, dbKieli: Kieli | null = null) {
  return inputKieli === undefined || dbKieli === inputKieli;
}

export function validateKielivalinta(dbProjekti: DBProjekti, projekti: Projekti, input: TallennaProjektiInput) {
  if (viimeisinTilaOnMigraatio(dbProjekti)) {
    // tai ei ole kuulutuksia/kutsuja ollenkaan
    return;
  }
  const kielivalintaaEiMuuteta =
    kieltaEiMuuteta(input.kielitiedot?.ensisijainenKieli, dbProjekti.kielitiedot?.ensisijainenKieli) &&
    kieltaEiMuuteta(input.kielitiedot?.toissijainenKieli, dbProjekti.kielitiedot?.toissijainenKieli);

  const allowedToChangeKielivalinta = isAllowedToChangeKielivalinta(projekti);

  if (!kielivalintaaEiMuuteta && !allowedToChangeKielivalinta) {
    throw new IllegalArgumentError(
      "Kielitietoja ei voi muuttaa aloituskuulutuksen julkaisemisen jälkeen tai aloituskuulutuksen ollessa hyväksyttävänä!"
    );
  }
}
