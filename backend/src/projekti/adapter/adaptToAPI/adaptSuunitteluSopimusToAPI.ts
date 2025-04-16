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
      etunimi: suunnitteluSopimus.etunimi,
      sukunimi: suunnitteluSopimus.sukunimi,
      puhelinnumero: suunnitteluSopimus.puhelinnumero,
      email: suunnitteluSopimus.email,
      yritys: suunnitteluSopimus.yritys,
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

    return {
      __typename: "SuunnitteluSopimusJulkaisu",
      kunta: suunnitteluSopimus.kunta,
      yritys: suunnitteluSopimus.yritys,
      logo,
      email: suunnitteluSopimus.email,
      etunimi: suunnitteluSopimus.etunimi,
      sukunimi: suunnitteluSopimus.sukunimi,
      puhelinnumero: suunnitteluSopimus.puhelinnumero,
    };
  }
  return suunnitteluSopimus;
}
