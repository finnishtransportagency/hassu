import { Kielitiedot, StandardiYhteystiedot, Linkki, Suunnitelma, Velho, Yhteystieto } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { IllegalArgumentError } from "../../../error/IllegalArgumentError";

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

export function adaptVelhoByAddingTypename(velho: Velho): API.Velho {
  return { __typename: "Velho", ...velho };
}

export function adaptYhteystiedotByAddingTypename(yhteystiedot: Yhteystieto[]): API.Yhteystieto[] {
  return yhteystiedot.map((yt) => ({ __typename: "Yhteystieto", ...yt }));
}

export function adaptStandardiYhteystiedotByAddingTypename(kuulutusYhteystiedot: StandardiYhteystiedot): API.StandardiYhteystiedot {
  return {
    __typename: "StandardiYhteystiedot",
    yhteysHenkilot: kuulutusYhteystiedot.yhteysHenkilot,
    yhteysTiedot: adaptYhteystiedotByAddingTypename(kuulutusYhteystiedot.yhteysTiedot || []),
  };
}
