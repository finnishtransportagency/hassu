import { DBVaylaUser, SuunnitteluSopimus, SuunnitteluSopimusJulkaisu } from "../database/model/projekti";
import { Yhteystieto } from "../database/model/common";

export function vaylaUserToYhteystieto(vaylaUser: DBVaylaUser, suunnitteluSopimus?: SuunnitteluSopimus | null): Yhteystieto {
  return {
    etunimi: vaylaUser.etunimi,
    sukunimi: vaylaUser.sukunimi,
    puhelinnumero: vaylaUser.puhelinnumero || "",
    sahkoposti: vaylaUser.email,
    organisaatio: vaylaUser.organisaatio,
    kunta: vaylaUser.kayttajatunnus === suunnitteluSopimus?.yhteysHenkilo ? suunnitteluSopimus.kunta : undefined,
  };
}

export function vaylaUserToYhteystieto2(
  vaylaUser: DBVaylaUser,
  suunnitteluSopimus?: SuunnitteluSopimusJulkaisu | SuunnitteluSopimus | null
): Yhteystieto {
  return {
    etunimi: vaylaUser.etunimi,
    sukunimi: vaylaUser.sukunimi,
    puhelinnumero: vaylaUser.puhelinnumero || "",
    sahkoposti: vaylaUser.email,
    organisaatio: vaylaUser.organisaatio,
    kunta:
      vaylaUser.kayttajatunnus === (suunnitteluSopimus as SuunnitteluSopimus)?.yhteysHenkilo ||
      vaylaUser.email === (suunnitteluSopimus as SuunnitteluSopimusJulkaisu)?.email
        ? suunnitteluSopimus?.kunta
        : undefined,
  };
}

export function yhteystietoPlusKunta(yhteystieto: Yhteystieto, suunnitteluSopimus?: SuunnitteluSopimusJulkaisu | null): Yhteystieto {
  return {
    ...yhteystieto,
    kunta: yhteystieto.sahkoposti === suunnitteluSopimus?.email ? yhteystieto.kunta : undefined,
  };
}
