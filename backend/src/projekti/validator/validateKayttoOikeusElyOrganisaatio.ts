import { TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { personSearch } from "../../personSearch/personSearchClient";
import { Person } from "../../personSearch/kayttajas";
import { organisaatioIsEly } from "../../util/organisaatioIsEly";

export async function validateKayttoOikeusElyOrganisaatio(input: TallennaProjektiInput) {
  if (input.kayttoOikeudet) {
    const kayttajaMap = (await personSearch.getKayttajas()).asMap();
    input.kayttoOikeudet.forEach((kayttoOikeus) => {
      const kayttajaTiedot = kayttajaMap[kayttoOikeus.kayttajatunnus] as Person | undefined;
      // Jos käyttäjää ei löydy, ei voida varmistaa hänen kuulumistaan ELYyn
      // Poistetaan elyOrganisaatio-tieto
      if (!kayttajaTiedot) {
        kayttoOikeus.elyOrganisaatio = undefined;
        throw new IllegalArgumentError(`Tallennettavaa käyttäjää '${kayttoOikeus.kayttajatunnus}' ei löydy käyttäjälistauksesta.`);
      }
      const nonElyUserWithElyOrganisaatio = !organisaatioIsEly(kayttajaTiedot.organisaatio) && !!kayttoOikeus.elyOrganisaatio;
      if (nonElyUserWithElyOrganisaatio) {
        throw new IllegalArgumentError(
          `Ely-organisaatiotarkennus asetettu virheellisesti käyttäjälle '${kayttoOikeus.kayttajatunnus}'. ` +
            `Kyseinen käyttäjä kuuluu organisaatioon '${kayttajaTiedot.organisaatio}'. ` +
            `Ely-organisaatiotarkennuksen voi asettaa vain käyttäjälle, jonka organisaatiotietona on 'ELY'.`
        );
      }
    });
  }
}
