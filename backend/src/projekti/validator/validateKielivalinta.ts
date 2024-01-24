import { DBProjekti } from "../../database/model";
import { Projekti, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { viimeisinTilaOnMigraatio } from "hassu-common/util/tilaUtils";
import { isAllowedToChangeKielivalinta } from "hassu-common/util/operationValidators";

export function validateKielivalinta(dbProjekti: DBProjekti, projekti: Projekti, input: TallennaProjektiInput) {
  if (viimeisinTilaOnMigraatio(dbProjekti)) {
    // tai ei ole kuulutuksia/kutsuja ollenkaan
    return;
  }
  const kielivalintaaOllaanMuuttamassa = !(
    (input.kielitiedot?.ensisijainenKieli === undefined ||
      dbProjekti.kielitiedot?.ensisijainenKieli === input.kielitiedot?.ensisijainenKieli) &&
    (input.kielitiedot?.toissijainenKieli === undefined ||
      dbProjekti.kielitiedot?.toissijainenKieli === input.kielitiedot?.toissijainenKieli)
  );

  const allowedToChangeKielivalinta = isAllowedToChangeKielivalinta(projekti);

  if (kielivalintaaOllaanMuuttamassa && !allowedToChangeKielivalinta) {
    throw new IllegalArgumentError(
      "Kielitietoja ei voi muuttaa aloituskuulutuksen julkaisemisen jälkeen tai aloituskuulutuksen ollessa hyväksyttävänä!"
    );
  }
}
