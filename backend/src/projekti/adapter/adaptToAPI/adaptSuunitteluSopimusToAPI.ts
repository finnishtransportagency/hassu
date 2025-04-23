import { SuunnitteluSopimus, SuunnitteluSopimusJulkaisu } from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { adaptLogotToAPI, adaptLogotToAPIJulkinen } from ".";

type SuunnitteluSopimusField = SuunnitteluSopimus | null | undefined;

export function adaptSuunnitteluSopimusToAPI(
  oid: string,
  suunnitteluSopimus: SuunnitteluSopimusField
): API.SuunnitteluSopimus | undefined | null {
  if (suunnitteluSopimus) {
    return {
      __typename: "SuunnitteluSopimus",
      kunta: suunnitteluSopimus.kunta,
      yhteysHenkilo: suunnitteluSopimus.yhteysHenkilo ?? "", // "" here to not break old test data because of missing value in mandatory field
      logo: suunnitteluSopimus.logo ? adaptLogotToAPI(oid, suunnitteluSopimus.logo) : null,
      osapuolet:
        suunnitteluSopimus.osapuolet?.map((osapuoli) => ({
          __typename: "SuunnitteluSopimusOsapuoli",
          osapuolenNimiEnsisijainen: osapuoli.osapuolenNimiEnsisijainen,
          osapuolenNimiToissijainen: osapuoli.osapuolenNimiToissijainen,
          osapuolenTyyppi: osapuoli.osapuolenTyyppi,
          osapuolenLogo: osapuoli.osapuolenLogo ? adaptLogotToAPI(oid, osapuoli.osapuolenLogo) : null,
          osapuolenHenkilot: osapuoli?.osapuolenHenkilot?.map((henkilo) => ({
            __typename: "OsapuolenHenkilo",
            etunimi: henkilo.etunimi,
            sukunimi: henkilo.sukunimi,
            puhelinnumero: henkilo.puhelinnumero,
            email: henkilo.email,
            yritys: henkilo.yritys,
            valittu: henkilo.valittu,
          })),
        })) || null,
    };
  }
  return suunnitteluSopimus;
}

export enum FileLocation {
  PUBLIC,
  YLLAPITO,
}

export function adaptSuunnitteluSopimusJulkaisuToAPI(
  oid: string,
  suunnitteluSopimus: SuunnitteluSopimusJulkaisu | null | undefined,
  fileLocation: FileLocation
): API.SuunnitteluSopimusJulkaisu | undefined | null {
  if (suunnitteluSopimus) {
    const adaptLogoFunction = fileLocation === FileLocation.PUBLIC ? adaptLogotToAPIJulkinen : adaptLogotToAPI;

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
      etunimi = suunnitteluSopimus?.etunimi ?? "";
      sukunimi = suunnitteluSopimus?.sukunimi ?? "";
      email = suunnitteluSopimus?.email ?? "";
      puhelinnumero = suunnitteluSopimus?.puhelinnumero ?? "";
    }

    return {
      __typename: "SuunnitteluSopimusJulkaisu",
      kunta: suunnitteluSopimus.kunta,
      logo: suunnitteluSopimus.logo ? adaptLogoFunction(oid, suunnitteluSopimus.logo) : null,
      email,
      etunimi,
      sukunimi,
      puhelinnumero,
      osapuolet: suunnitteluSopimus.osapuolet
        ? suunnitteluSopimus.osapuolet.map((osapuoli) => ({
            __typename: "SuunnitteluSopimusOsapuoli",
            osapuolenNimiEnsisijainen: osapuoli.osapuolenNimiEnsisijainen || "",
            osapuolenNimiToissijainen: osapuoli.osapuolenNimiToissijainen || "",
            osapuolenTyyppi: osapuoli.osapuolenTyyppi || "",
            osapuolenLogo: osapuoli.osapuolenLogo ? adaptLogoFunction(oid, osapuoli.osapuolenLogo) : null,
            osapuolenHenkilot: osapuoli.osapuolenHenkilot
              ? osapuoli.osapuolenHenkilot.map((henkilo) => ({
                  __typename: "OsapuolenHenkilo",
                  etunimi: henkilo.etunimi || "",
                  sukunimi: henkilo.sukunimi || "",
                  puhelinnumero: henkilo.puhelinnumero || "",
                  email: henkilo.email || "",
                  yritys: henkilo.yritys || "",
                  valittu: henkilo.valittu || false,
                }))
              : [],
          }))
        : null,
    };
  }
  return suunnitteluSopimus;
}
