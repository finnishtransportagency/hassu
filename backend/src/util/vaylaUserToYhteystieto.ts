import { DBVaylaUser } from "../database/model/projekti";
import { Yhteystieto } from "../database/model/common";

export function vaylaUserToYhteystieto(vaylaUser: DBVaylaUser): Yhteystieto {
  return {
    etunimi: vaylaUser.etunimi,
    sukunimi: vaylaUser.sukunimi,
    puhelinnumero: vaylaUser.puhelinnumero || "",
    sahkoposti: vaylaUser.email,
    organisaatio: vaylaUser.organisaatio,
  };
}
