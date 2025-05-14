import { DBVaylaUser, SuunnitteluSopimus, SuunnitteluSopimusJulkaisu } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { adaptLogotToAPIJulkinen } from "..";

export function adaptSuunnitteluSopimusJulkaisuJulkinen(
  oid: string,
  suunnitteluSopimus: SuunnitteluSopimusJulkaisu | null | undefined
): API.SuunnitteluSopimusJulkaisu | undefined | null {
  if (suunnitteluSopimus) {
    return {
      __typename: "SuunnitteluSopimusJulkaisu",
      kunta: suunnitteluSopimus.kunta,
      logo: suunnitteluSopimus.logo ? adaptLogotToAPIJulkinen(oid, suunnitteluSopimus.logo) : null,
      etunimi: suunnitteluSopimus.etunimi,
      sukunimi: suunnitteluSopimus.sukunimi,
      email: suunnitteluSopimus.email,
      puhelinnumero: suunnitteluSopimus.puhelinnumero,
      osapuolet:
        suunnitteluSopimus.osapuolet?.map((osapuoli) => ({
          __typename: "SuunnitteluSopimusOsapuoli",
          osapuolenNimiFI: osapuoli.osapuolenNimiFI || "",
          osapuolenNimiSV: osapuoli.osapuolenNimiSV || "",
          osapuolenTyyppi: osapuoli.osapuolenTyyppi || "",
          osapuolenLogo: osapuoli.osapuolenLogo ? adaptLogotToAPIJulkinen(oid, osapuoli.osapuolenLogo) : null,
          osapuolenHenkilot:
            osapuoli.osapuolenHenkilot
              ?.filter((henkilo) => henkilo.valittu)
              .map((henkilo) => ({
                __typename: "OsapuolenHenkilo",
                etunimi: henkilo.etunimi || "",
                sukunimi: henkilo.sukunimi || "",
                puhelinnumero: henkilo.puhelinnumero || "",
                email: henkilo.email || "",
                yritys: henkilo.yritys || "",
                kunta: henkilo.kunta || "",
                //valittu: henkilo.valittu ?? true,
              })) || [],
        })) || null,
    };
  }
  return suunnitteluSopimus;
}

export function adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisuJulkinen(
  oid: string,
  suunnitteluSopimus: SuunnitteluSopimus | null | undefined,
  yhteysHenkilo?: DBVaylaUser | undefined
): API.SuunnitteluSopimusJulkaisu | undefined | null {
  if (suunnitteluSopimus) {
    return {
      __typename: "SuunnitteluSopimusJulkaisu",
      kunta: suunnitteluSopimus.kunta,
      logo: suunnitteluSopimus.logo ? adaptLogotToAPIJulkinen(oid, suunnitteluSopimus.logo) : null,
      etunimi: yhteysHenkilo?.etunimi,
      sukunimi: yhteysHenkilo?.sukunimi,
      email: yhteysHenkilo?.email,
      puhelinnumero: yhteysHenkilo?.puhelinnumero,
      osapuolet:
        suunnitteluSopimus.osapuolet?.map((osapuoli) => ({
          __typename: "SuunnitteluSopimusOsapuoli",
          osapuolenNimiFI: osapuoli.osapuolenNimiFI || "",
          osapuolenNimiSV: osapuoli.osapuolenNimiSV || "",
          osapuolenTyyppi: osapuoli.osapuolenTyyppi || "",
          osapuolenLogo: osapuoli.osapuolenLogo ? adaptLogotToAPIJulkinen(oid, osapuoli.osapuolenLogo) : null,
          osapuolenHenkilot:
            osapuoli.osapuolenHenkilot
              ?.filter((henkilo) => henkilo.valittu)
              .map((henkilo) => ({
                __typename: "OsapuolenHenkilo",
                etunimi: henkilo.etunimi || "",
                sukunimi: henkilo.sukunimi || "",
                puhelinnumero: henkilo.puhelinnumero || "",
                email: henkilo.email || "",
                yritys: henkilo.yritys || "",
                // valittu: henkilo.valittu ?? true,
              })) || [],
        })) || null,
    };
  }
  return suunnitteluSopimus;
}
