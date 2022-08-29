import { DBVaylaUser, Yhteystieto } from "../../database/model";

export function konvertoiPPVaylaUseristaYhteystiedoksi(pp: DBVaylaUser): Yhteystieto {
  return {
    etunimi: pp.nimi.split(",")[1].trim(),
    sukunimi: pp.nimi.split(",")[0].trim(),
    puhelinnumero: pp.puhelinnumero,
    sahkoposti: pp.email,
    organisaatio: pp.organisaatio,
  };
}
