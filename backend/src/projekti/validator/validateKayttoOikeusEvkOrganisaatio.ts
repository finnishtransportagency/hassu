import { TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { personSearch } from "../../personSearch/personSearchClient";
import { organisaatioIsEvk } from "hassu-common/util/organisaatioIsEly";
import { DBProjekti } from "../../database/model";

export async function validateKayttoOikeusEvkOrganisaatio(projekti: DBProjekti, input: TallennaProjektiInput) {
  if (input.kayttoOikeudet) {
    const kayttajaMap = (await personSearch.getKayttajas()).asMap();
    input.kayttoOikeudet.forEach((kayttoOikeus) => {
      const person = kayttajaMap[kayttoOikeus.kayttajatunnus];
      const projektiHenkilo = projekti.kayttoOikeudet.find((ko) => ko.kayttajatunnus === kayttoOikeus.kayttajatunnus);
      const organisaatio = person ? person.organisaatio : projektiHenkilo?.organisaatio;

      const nonEvkUserWithEvkOrganisaatio = !organisaatioIsEvk(organisaatio) && !!kayttoOikeus.evkOrganisaatio;
      if (nonEvkUserWithEvkOrganisaatio) {
        throw new IllegalArgumentError(
          `Elinvoimakeskus-organisaatiotarkennus asetettu virheellisesti käyttäjälle '${kayttoOikeus.kayttajatunnus}'. ` +
            `Kyseinen käyttäjä kuuluu organisaatioon '${organisaatio}'. ` +
            `Elinvoimakeskus-organisaatiotarkennuksen voi asettaa vain käyttäjälle, jonka organisaatiotietona on 'Elinvoimakeskus'.`
        );
      }
    });
  }
}
