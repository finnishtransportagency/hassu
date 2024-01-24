import { DBVaylaUser, Kielitiedot, LinkitettyVelhoProjekti, Linkki, StandardiYhteystiedot, Yhteystieto } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";

export function adaptKielitiedotByAddingTypename(
  kielitiedot: Kielitiedot | null | undefined,
  undefinedOk?: boolean
): API.Kielitiedot | undefined {
  if (!undefinedOk && !kielitiedot) {
    throw new IllegalArgumentError("Kielitiedot puuttuu!");
  }
  if (!kielitiedot) {
    return undefined;
  }
  return {
    ...kielitiedot,
    ensisijainenKieli: kielitiedot.ensisijainenKieli,
    __typename: "Kielitiedot",
  };
}

export function adaptLinkkiByAddingTypename(link: Linkki | undefined | null): API.Linkki | undefined {
  if (link) {
    return {
      ...link,
      __typename: "Linkki",
    };
  }
  return link as undefined;
}

export function adaptLinkkiListByAddingTypename(links: Array<Linkki> | null | undefined): API.Linkki[] | undefined {
  if (links) {
    return links.map((link) => ({
      ...link,
      __typename: "Linkki",
    }));
  }
  return links as undefined;
}

export function adaptLinkitetytProjektitByAddingTypename(
  projektit: Array<LinkitettyVelhoProjekti> | null | undefined
): API.LinkitettyVelhoProjekti[] | undefined {
  if (projektit) {
    return projektit.map((projekti) => ({
      ...projekti,
      __typename: "LinkitettyVelhoProjekti",
    }));
  }
  return projektit as undefined;
}

export function adaptYhteystiedotByAddingTypename(yhteystiedot: Yhteystieto[] | undefined | null): API.Yhteystieto[] | undefined | null {
  if (yhteystiedot) {
    return yhteystiedot.map((yt) => ({ __typename: "Yhteystieto", ...yt }));
  }
  return yhteystiedot;
}

export function adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot: Yhteystieto[]): API.Yhteystieto[] {
  return yhteystiedot.map((yt) => ({ __typename: "Yhteystieto", ...yt }));
}

export function adaptMandatoryStandardiYhteystiedotByAddingTypename(
  kayttoOikeudet: DBVaylaUser[],
  kuulutusYhteystiedot: StandardiYhteystiedot
): API.StandardiYhteystiedot {
  return {
    __typename: "StandardiYhteystiedot",
    yhteysHenkilot: kuulutusYhteystiedot.yhteysHenkilot?.filter((user) => kayttoOikeudet.find((oikeus) => oikeus.kayttajatunnus === user)),
    yhteysTiedot: adaptYhteystiedotByAddingTypename(kuulutusYhteystiedot.yhteysTiedot),
  };
}

export function adaptStandardiYhteystiedotByAddingTypename(
  kayttoOikeudet: DBVaylaUser[],
  kuulutusYhteystiedot: StandardiYhteystiedot | undefined
): API.StandardiYhteystiedot | undefined {
  if (!kuulutusYhteystiedot) {
    return undefined;
  }
  return adaptMandatoryStandardiYhteystiedotByAddingTypename(kayttoOikeudet, kuulutusYhteystiedot);
}
