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

    return {
      __typename: "SuunnitteluSopimusJulkaisu",
      kunta: suunnitteluSopimus.kunta,
      logo: adaptLogotToAPIJulkinen(oid, suunnitteluSopimus.logo),
      email: suunnitteluSopimus.email,
      etunimi: suunnitteluSopimus.etunimi,
      sukunimi: suunnitteluSopimus.sukunimi,
      puhelinnumero: suunnitteluSopimus.puhelinnumero,
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
      logo: adaptLogotToAPIJulkinen(oid, suunnitteluSopimus.logo),
      etunimi: yhteysHenkilo?.etunimi ?? "",
      sukunimi: yhteysHenkilo?.sukunimi ?? "",
      email: yhteysHenkilo?.email ?? "",
      puhelinnumero: yhteysHenkilo?.puhelinnumero ?? "",
    };
  }
  return suunnitteluSopimus;
}
