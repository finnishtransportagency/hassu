import { Kieli, ProjektiKayttaja, SuunnitteluSopimus, Yhteystieto } from "@services/api";
import { kuntametadata } from "common/kuntametadata";

export default function projektiKayttajaToYhteystieto(
  projektiKayttaja: ProjektiKayttaja,
  suunnitteluSopimus?: SuunnitteluSopimus | null
): Yhteystieto {
  return {
    __typename: "Yhteystieto",
    etunimi: projektiKayttaja.etunimi,
    sukunimi: projektiKayttaja.sukunimi,
    puhelinnumero: projektiKayttaja.puhelinnumero || "",
    sahkoposti: projektiKayttaja.email,
    kunta: suunnitteluSopimus?.yhteysHenkilo === projektiKayttaja.kayttajatunnus ? suunnitteluSopimus?.kunta : null,
    organisaatio: projektiKayttaja.organisaatio,
  };
}

export function yhteystietoVirkamiehelleTekstiksi(yhteystieto: Yhteystieto & { kayttajatunnus?: string | null }) {
  const { etunimi, sukunimi, kayttajatunnus, organisaatio, kunta, puhelinnumero, sahkoposti } = yhteystieto;
  return `${etunimi} ${sukunimi}${kayttajatunnus ? `, ${kayttajatunnus},` : ""} (${
    kunta ? kuntametadata.nameForKuntaId(kunta, Kieli.SUOMI) : organisaatio
  }), ${puhelinnumero}, ${sahkoposti}`;
}
