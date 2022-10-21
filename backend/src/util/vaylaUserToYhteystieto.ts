import { DBVaylaUser, Yhteystieto, SuunnitteluSopimus } from "../database/model/";

export function vaylaUserToYhteystieto(vaylaUser: DBVaylaUser, suunnitteluSopimus?: SuunnitteluSopimus | undefined | null): Yhteystieto {
  const [sukunimi, etunimi] = vaylaUser.nimi.split(/, /g);
  return {
    etunimi,
    sukunimi,
    puhelinnumero: vaylaUser.puhelinnumero || "",
    sahkoposti: vaylaUser.email,
    organisaatio: vaylaUser.kayttajatunnus === suunnitteluSopimus?.yhteysHenkilo ? suunnitteluSopimus.kunta : vaylaUser.organisaatio,
  };
}
