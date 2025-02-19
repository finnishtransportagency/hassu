import { TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { personSearch } from "../../personSearch/personSearchClient";
import { organisaatioIsEly } from "hassu-common/util/organisaatioIsEly";
import { DBProjekti } from "../../database/model";

export async function validateKayttoOikeusElyOrganisaatio(projekti: DBProjekti, input: TallennaProjektiInput) {
  if (input.kayttoOikeudet) {
    const kayttajaMap = (await personSearch.getKayttajas()).asMap();
    input.kayttoOikeudet.forEach((kayttoOikeus) => {
      const person = kayttajaMap[kayttoOikeus.kayttajatunnus];
      const projektiHenkilo = projekti.kayttoOikeudet.find((ko) => ko.kayttajatunnus === kayttoOikeus.kayttajatunnus);
      const organisaatio = person ? person.organisaatio : projektiHenkilo?.organisaatio;

      const nonElyUserWithElyOrganisaatio = !organisaatioIsEly(organisaatio) && !!kayttoOikeus.elyOrganisaatio;
      if (nonElyUserWithElyOrganisaatio) {
        throw new IllegalArgumentError(
          `Ely-organisaatiotarkennus asetettu virheellisesti käyttäjälle '${kayttoOikeus.kayttajatunnus}'. ` +
            `Kyseinen käyttäjä kuuluu organisaatioon '${organisaatio}'. ` +
            `Ely-organisaatiotarkennuksen voi asettaa vain käyttäjälle, jonka organisaatiotietona on 'ELY'.`
        );
      }
    });
  }
}
