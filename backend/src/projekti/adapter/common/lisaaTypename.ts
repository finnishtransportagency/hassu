import { Kielitiedot, KuulutusYhteystiedot, Linkki, Suunnitelma, Velho, Yhteystieto } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";

export function adaptLiittyvatSuunnitelmatByAddingTypename(suunnitelmat?: Suunnitelma[] | null): API.Suunnitelma[] | undefined | null {
  if (suunnitelmat) {
    const liittyvatSuunnitelmat = suunnitelmat.map(
      (suunnitelma) =>
        ({
          __typename: "Suunnitelma",
          ...suunnitelma,
        } as Suunnitelma)
    );
    return liittyvatSuunnitelmat as API.Suunnitelma[];
  }
  return suunnitelmat as undefined | null;
}

export function adaptKielitiedotByAddingTypename(kielitiedot?: Kielitiedot | null): API.Kielitiedot | undefined | null {
  if (kielitiedot) {
    return {
      ...kielitiedot,
      __typename: "Kielitiedot",
    };
  }
  return kielitiedot as undefined;
}

export function adaptLinkkiByAddingTypename(link: Linkki): API.Linkki {
  if (link) {
    return {
      ...link,
      __typename: "Linkki",
    };
  }
  return link as undefined;
}

export function adaptLinkkiListByAddingTypename(links: Array<Linkki>): API.Linkki[] {
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

export function adaptYhteystiedotByAddingTypename(yhteystiedot: Yhteystieto[]): API.Yhteystieto[] | undefined | null {
  if (yhteystiedot) {
    return yhteystiedot.map((yt) => ({ __typename: "Yhteystieto", ...yt }));
  }
  return yhteystiedot as undefined | null;
}

export function adaptKuulutusYhteystiedotByAddingTypename(
  kuulutusYhteystiedot: KuulutusYhteystiedot
): API.KuulutusYhteystiedot | undefined | null {
  if (kuulutusYhteystiedot) {
    return {
      __typename: "KuulutusYhteystiedot",
      yhteysHenkilot: kuulutusYhteystiedot.yhteysHenkilot,
      yhteysTiedot: adaptYhteystiedotByAddingTypename(kuulutusYhteystiedot.yhteysTiedot),
    };
  }
  return kuulutusYhteystiedot as undefined;
}
