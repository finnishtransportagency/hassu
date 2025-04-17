import { SuunnitteluSopimus, SuunnitteluSopimusJulkaisu } from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { adaptLogotToAPI, adaptLogotToAPIJulkinen } from ".";

type SuunnitteluSopimusField = SuunnitteluSopimus | null | undefined;

export function adaptSuunnitteluSopimusToAPI(
  oid: string,
  suunnitteluSopimus: SuunnitteluSopimusField
): API.SuunnitteluSopimus | undefined | null {
  if (suunnitteluSopimus) {
    if (!suunnitteluSopimus.logo) {
      throw new Error("adaptSuunnitteluSopimus: suunnitteluSopimus.logo määrittelemättä");
    }

    return {
      __typename: "SuunnitteluSopimus",
      kunta: suunnitteluSopimus.kunta,
      yhteysHenkilo: suunnitteluSopimus.yhteysHenkilo ?? "", // "" here to not break old test data because of missing value in mandatory field
      logo: adaptLogotToAPI(oid, suunnitteluSopimus.logo),
      osapuolet:
        suunnitteluSopimus.osapuolet?.map((osapuoli) => ({
          __typename: "SuunnitteluSopimusOsapuoli",
          osapuolenNimiEnsisijainen: osapuoli.osapuolenNimiEnsisijainen,
          osapuolenNimiToissijainen: osapuoli.osapuolenNimiToissijainen,
          osapuolenTyyppi: osapuoli.osapuolenTyyppi,
          osapuolenHenkilot: osapuoli.osapuolenHenkilot.map((henkilo) => ({
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
    if (!suunnitteluSopimus.logo) {
      throw new Error("adaptSuunnitteluSopimus: suunnitteluSopimus.logo määrittelemättä");
    }

    let logo: API.LokalisoituTeksti | undefined;
    if (fileLocation === FileLocation.PUBLIC) {
      logo = adaptLogotToAPIJulkinen(oid, suunnitteluSopimus.logo);
    } else {
      logo = adaptLogotToAPI(oid, suunnitteluSopimus.logo);
    }

    const etunimi = suunnitteluSopimus.etunimi || "";
    const sukunimi = suunnitteluSopimus.sukunimi || "";
    const puhelinnumero = suunnitteluSopimus.puhelinnumero || "";

    return {
      __typename: "SuunnitteluSopimusJulkaisu",
      kunta: suunnitteluSopimus.kunta,
      logo,
      email: suunnitteluSopimus.email,
      etunimi,
      sukunimi,
      puhelinnumero,
    };
  }
  return suunnitteluSopimus;
}
