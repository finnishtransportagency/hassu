import { DBVaylaUser, SuunnitteluSopimus, SuunnitteluSopimusJulkaisu } from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { adaptLogot, adaptLogotJulkinen } from ".";

type SuunnitteluSopimusField = SuunnitteluSopimus | null | undefined;

export function adaptSuunnitteluSopimus(
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
      logo: adaptLogot(oid, suunnitteluSopimus.logo),
    };
  }
  return suunnitteluSopimus;
}

export enum FileLocation {
  PUBLIC,
  YLLAPITO,
}

type SuunnitteluSopimusJulkaisuField = API.SuunnitteluSopimusJulkaisu | undefined | null;

export function adaptSuunnitteluSopimusJulkaisu(
  oid: string,
  suunnitteluSopimus: SuunnitteluSopimusJulkaisu | null | undefined,
  fileLocation: FileLocation
): SuunnitteluSopimusJulkaisuField {
  if (suunnitteluSopimus) {
    if (!suunnitteluSopimus.logo) {
      throw new Error("adaptSuunnitteluSopimus: suunnitteluSopimus.logo määrittelemättä");
    }

    let logo: API.LokalisoituTeksti | undefined;
    if (fileLocation === FileLocation.PUBLIC) {
      logo = adaptLogotJulkinen(oid, suunnitteluSopimus.logo);
    } else {
      logo = adaptLogot(oid, suunnitteluSopimus.logo);
    }

    return {
      __typename: "SuunnitteluSopimusJulkaisu",
      kunta: suunnitteluSopimus.kunta,
      logo,
      email: suunnitteluSopimus.email,
      etunimi: suunnitteluSopimus.etunimi,
      sukunimi: suunnitteluSopimus.sukunimi,
      puhelinnumero: suunnitteluSopimus.puhelinnumero,
    };
  }
  return suunnitteluSopimus;
}

export function adaptSuunnitteluSopimusJulkaisuJulkinen(
  oid: string,
  suunnitteluSopimus: SuunnitteluSopimusJulkaisu | null | undefined
): SuunnitteluSopimusJulkaisuField {
  if (suunnitteluSopimus) {
    if (!suunnitteluSopimus.logo) {
      throw new Error("adaptSuunnitteluSopimus: suunnitteluSopimus.logo määrittelemättä");
    }

    return {
      __typename: "SuunnitteluSopimusJulkaisu",
      kunta: suunnitteluSopimus.kunta,
      logo: adaptLogotJulkinen(oid, suunnitteluSopimus.logo),
      email: suunnitteluSopimus.email,
      etunimi: suunnitteluSopimus.etunimi,
      sukunimi: suunnitteluSopimus.sukunimi,
      puhelinnumero: suunnitteluSopimus.puhelinnumero,
    };
  }
  return suunnitteluSopimus;
}

export function adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu(
  oid: string,
  suunnitteluSopimus: SuunnitteluSopimus | null | undefined,
  yhteysHenkilo: DBVaylaUser | undefined
): API.SuunnitteluSopimusJulkaisu | undefined | null {
  if (suunnitteluSopimus) {
    if (!suunnitteluSopimus.logo) {
      throw new Error("adaptSuunnitteluSopimus: suunnitteluSopimus.logo määrittelemättä");
    }

    return {
      __typename: "SuunnitteluSopimusJulkaisu",
      kunta: suunnitteluSopimus.kunta,
      logo: adaptLogot(oid, suunnitteluSopimus.logo),
      etunimi: yhteysHenkilo?.etunimi ?? "",
      sukunimi: yhteysHenkilo?.sukunimi ?? "",
      email: yhteysHenkilo?.email ?? "",
      puhelinnumero: yhteysHenkilo?.puhelinnumero ?? "",
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

    return {
      __typename: "SuunnitteluSopimusJulkaisu",
      kunta: suunnitteluSopimus.kunta,
      logo: adaptLogotJulkinen(oid, suunnitteluSopimus.logo),
      etunimi: yhteysHenkilo?.etunimi ?? "",
      sukunimi: yhteysHenkilo?.sukunimi ?? "",
      email: yhteysHenkilo?.email ?? "",
      puhelinnumero: yhteysHenkilo?.puhelinnumero ?? "",
    };
  }
  return suunnitteluSopimus;
}
