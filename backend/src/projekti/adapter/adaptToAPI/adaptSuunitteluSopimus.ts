import { DBVaylaUser, SuunnitteluSopimus, SuunnitteluSopimusJulkaisu } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { fileService } from "../../../files/fileService";

export function adaptSuunnitteluSopimus(
  oid: string,
  suunnitteluSopimus: SuunnitteluSopimus | null | undefined
): API.SuunnitteluSopimus | undefined | null {
  if (suunnitteluSopimus) {
    if (!suunnitteluSopimus.logo) {
      throw new Error("adaptSuunnitteluSopimus: suunnitteluSopimus.logo määrittelemättä");
    }

    return {
      __typename: "SuunnitteluSopimus",
      kunta: suunnitteluSopimus.kunta,
      yhteysHenkilo: suunnitteluSopimus.yhteysHenkilo || "", // "" here to not break old test data because of missing value in mandatory field
      logo: fileService.getYllapitoPathForProjektiFile(oid, suunnitteluSopimus.logo),
    };
  }
  return suunnitteluSopimus;
}

export function adaptSuunnitteluSopimusJulkaisu(
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
      logo: fileService.getYllapitoPathForProjektiFile(oid, suunnitteluSopimus.logo),
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
): API.SuunnitteluSopimusJulkaisu | undefined | null {
  if (suunnitteluSopimus) {
    if (!suunnitteluSopimus.logo) {
      throw new Error("adaptSuunnitteluSopimus: suunnitteluSopimus.logo määrittelemättä");
    }

    return {
      __typename: "SuunnitteluSopimusJulkaisu",
      kunta: suunnitteluSopimus.kunta,
      logo: fileService.getPublicPathForProjektiFile(oid, suunnitteluSopimus.logo),
      email: suunnitteluSopimus.email,
      etunimi: suunnitteluSopimus.etunimi,
      sukunimi: suunnitteluSopimus.sukunimi,
      puhelinnumero: suunnitteluSopimus.puhelinnumero,
    };
  }
  return suunnitteluSopimus;
}

export function adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu(
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
      logo: suunnitteluSopimus.logo,
      etunimi: yhteysHenkilo?.nimi.split(/, /g)[1] || "",
      sukunimi: yhteysHenkilo?.nimi.split(/, /g)[0] || "",
      email: yhteysHenkilo?.email || "",
      puhelinnumero: yhteysHenkilo?.puhelinnumero || "",
    };
  }
  return suunnitteluSopimus;
}
