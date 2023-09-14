import { DBVaylaUser, Kielitiedot, Linkki, StandardiYhteystiedot, Suunnitelma, Velho, Yhteystieto } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { IllegalArgumentError } from "../../../error/IllegalArgumentError";
import { kuntametadata } from "../../../../../common/kuntametadata";

export function adaptLiittyvatSuunnitelmatByAddingTypename(suunnitelmat?: Suunnitelma[] | null): API.Suunnitelma[] | undefined | null {
  if (suunnitelmat) {
    const liittyvatSuunnitelmat = suunnitelmat.map((suunnitelma) => {
      const s: API.Suunnitelma = {
        __typename: "Suunnitelma",
        ...suunnitelma,
      };
      return s;
    });
    return liittyvatSuunnitelmat as API.Suunnitelma[];
  }
  return suunnitelmat as undefined | null;
}

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

export function adaptVelho(velho: Velho | null | undefined): API.Velho {
  return {
    __typename: "Velho",
    ...velho,
    kunnat: velho?.kunnat?.map(kuntametadata.idForKuntaName),
    maakunnat: velho?.maakunnat?.map(kuntametadata.idForMaakuntaName),
  };
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
