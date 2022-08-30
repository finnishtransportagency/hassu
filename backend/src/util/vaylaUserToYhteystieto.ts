import { DBVaylaUser } from "../database/model/projekti";
import { Yhteystieto } from "../database/model/common";

export function vaylaUserToYhteystieto(vaylaUser: DBVaylaUser): Yhteystieto {
  const [sukunimi, etunimi] = vaylaUser.nimi.split(/, /g);
  return {
    etunimi,
    sukunimi,
    puhelinnumero: vaylaUser.puhelinnumero,
    sahkoposti: vaylaUser.email,
    organisaatio: vaylaUser.organisaatio,
  };
}
