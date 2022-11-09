import { Kieli, ProjektiKayttaja, SuunnitteluSopimus, Yhteystieto } from "@services/api";
import { kuntametadata } from "common/kuntametadata";

export default function projektiKayttajaToYhteystieto(
  projektiKayttaja: ProjektiKayttaja,
  suunnitteluSopimus?: SuunnitteluSopimus | null
): Yhteystieto {
  const [etunimi, sukunimi] = projektiKayttaja.nimi.split(", ");
  return {
    __typename: "Yhteystieto",
    etunimi: etunimi as string,
    sukunimi: sukunimi as string,
    puhelinnumero: projektiKayttaja.puhelinnumero || "",
    sahkoposti: projektiKayttaja.email,
    kunta: suunnitteluSopimus?.yhteysHenkilo === projektiKayttaja.kayttajatunnus ? suunnitteluSopimus?.kunta : null,
    organisaatio: projektiKayttaja.organisaatio,
  };
}

export function yhteystietoVirkamiehelleTekstiksi(yhteystieto: Yhteystieto & { kayttajatunnus: string }) {
  const { etunimi, sukunimi, kayttajatunnus, organisaatio, kunta } = yhteystieto;
  return `${etunimi} ${sukunimi}, ${kayttajatunnus} (${kunta ? kuntametadata.nameForKuntaId(kunta, Kieli.SUOMI) : organisaatio})`;
}
