import { DBVaylaUser, SuunnitteluSopimus, SuunnitteluSopimusJulkaisu } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { adaptLogotToAPIJulkinen } from "..";

export function adaptSuunnitteluSopimusJulkaisuJulkinen(
  oid: string,
  suunnitteluSopimus: SuunnitteluSopimusJulkaisu | null | undefined
): API.SuunnitteluSopimusJulkaisu | undefined | null {
  if (suunnitteluSopimus) {
    if (!suunnitteluSopimus.logo) {
      throw new Error("adaptSuunnitteluSopimus: suunnitteluSopimus.logo määrittelemättä");
    }

    const valitutHenkilot =
      suunnitteluSopimus.osapuolet?.flatMap((osapuoli) => osapuoli.osapuolenHenkilot?.filter((henkilo) => henkilo?.valittu) || []) || [];

    let etunimi = "";
    let sukunimi = "";
    let email = "";
    let puhelinnumero = "";

    if (valitutHenkilot.length > 0) {
      etunimi = valitutHenkilot[0].etunimi || "";
      sukunimi = valitutHenkilot[0].sukunimi || "";
      email = valitutHenkilot[0].email || "";
      puhelinnumero = valitutHenkilot[0].puhelinnumero || "";
    } else {
      etunimi = suunnitteluSopimus.etunimi || "";
      sukunimi = suunnitteluSopimus.sukunimi || "";
      email = suunnitteluSopimus.email || "";
      puhelinnumero = suunnitteluSopimus.puhelinnumero || "";
    }

    return {
      __typename: "SuunnitteluSopimusJulkaisu",
      kunta: suunnitteluSopimus.kunta,
      logo: adaptLogotToAPIJulkinen(oid, suunnitteluSopimus.logo),
      email,
      etunimi,
      sukunimi,
      puhelinnumero,
      osapuolet:
        suunnitteluSopimus.osapuolet?.map((osapuoli) => ({
          __typename: "SuunnitteluSopimusOsapuoli",
          osapuolenNimiEnsisijainen: osapuoli.osapuolenNimiEnsisijainen || "",
          osapuolenNimiToissijainen: osapuoli.osapuolenNimiToissijainen || "",
          osapuolenTyyppi: osapuoli.osapuolenTyyppi || "",
          //osapuolenLogo: osapuoli.osapuolenLogo ? adaptLogotToAPIJulkinen(oid, osapuoli.osapuolenLogo) : null,
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
              })) || [],
        })) || null,
    };
  }
  return suunnitteluSopimus;
}

export function adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisuJulkinen(
  oid: string,
  suunnitteluSopimus: SuunnitteluSopimus | null | undefined,
  yhteysHenkilo: DBVaylaUser | undefined
): API.SuunnitteluSopimusJulkaisu | undefined | null {
  if (suunnitteluSopimus) {
    if (!suunnitteluSopimus.logo) {
      throw new Error("adaptSuunnitteluSopimus: suunnitteluSopimus.logo määrittelemättä");
    }
    const valitutHenkilot =
      suunnitteluSopimus.osapuolet?.flatMap((osapuoli) => osapuoli.osapuolenHenkilot?.filter((henkilo) => henkilo?.valittu) || []) || [];

    let etunimi = "";
    let sukunimi = "";
    let email = "";
    let puhelinnumero = "";

    if (valitutHenkilot.length > 0) {
      etunimi = valitutHenkilot[0].etunimi || "";
      sukunimi = valitutHenkilot[0].sukunimi || "";
      email = valitutHenkilot[0].email || "";
      puhelinnumero = valitutHenkilot[0].puhelinnumero || "";
    } else {
      etunimi = yhteysHenkilo?.etunimi ?? "";
      sukunimi = yhteysHenkilo?.sukunimi ?? "";
      email = yhteysHenkilo?.email ?? "";
      puhelinnumero = yhteysHenkilo?.puhelinnumero ?? "";
    }

    return {
      __typename: "SuunnitteluSopimusJulkaisu",
      kunta: suunnitteluSopimus.kunta,
      logo: adaptLogotToAPIJulkinen(oid, suunnitteluSopimus.logo),
      etunimi,
      sukunimi,
      email,
      puhelinnumero,
      osapuolet:
        suunnitteluSopimus.osapuolet?.map((osapuoli) => ({
          __typename: "SuunnitteluSopimusOsapuoli",
          osapuolenNimiEnsisijainen: osapuoli.osapuolenNimiEnsisijainen || "",
          osapuolenNimiToissijainen: osapuoli.osapuolenNimiToissijainen || "",
          osapuolenTyyppi: osapuoli.osapuolenTyyppi || "",
          //osapuolenLogo: osapuoli.osapuolenLogo ? adaptLogotToAPIJulkinen(oid, osapuoli.osapuolenLogo) : null,
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
              })) || [],
        })) || null,
    };
  }
  return suunnitteluSopimus;
}
