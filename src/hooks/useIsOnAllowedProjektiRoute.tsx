import { Status } from "@services/api";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { ProjektiLisatiedolla, useProjekti } from "./useProjekti";

export interface Route {
  title: string;
  requiredStatus: Status;
  pathname?: string;
  visible?: (projekti: ProjektiLisatiedolla | null | undefined) => boolean;
  id: string;
  requireExactMatch?: boolean;
}

export const routes: Route[] = [
  {
    title: "Projektin henkilöt",
    id: "projektin_henkilot",
    requiredStatus: Status.EI_JULKAISTU_PROJEKTIN_HENKILOT,
    pathname: `/yllapito/projekti/[oid]/henkilot`,
  },
  {
    title: "Projektin tiedot",
    id: "projektin_tiedot",
    requiredStatus: Status.EI_JULKAISTU,
    pathname: `/yllapito/projekti/[oid]`,
    requireExactMatch: true,
  },
  {
    title: "Käsittelyn tila",
    id: "kasittelyn_tila",
    requiredStatus: Status.ALOITUSKUULUTUS, //TODO: avataan nyt samaan aikaan kuin aloituskuulutus lahinna esteettisista syista, ei ole speksattu tarkasti avautumista? Muutettava myohemmin, ettei sotke automaattista ohjausta (ordinal) tietyn vaiheen tayttamisen
    pathname: `/yllapito/projekti/[oid]/kasittelyntila`,
  },
  {
    title: "Aloituskuulutus",
    id: "aloituskuulutus",
    requiredStatus: Status.ALOITUSKUULUTUS,
    pathname: `/yllapito/projekti/[oid]/aloituskuulutus`,
  },
  {
    title: "Suunnitteluvaihe",
    id: "suunnitteluvaihe",
    requiredStatus: Status.SUUNNITTELU,
    pathname: `/yllapito/projekti/[oid]/suunnittelu`,
  },
  {
    title: "Nähtävilläolovaihe",
    id: "nahtavillaolovaihe",
    requiredStatus: Status.NAHTAVILLAOLO,
    pathname: `/yllapito/projekti/[oid]/nahtavillaolo`,
  },
  {
    title: "Hyväksyminen",
    id: "hyvaksyminen",
    requiredStatus: Status.HYVAKSYMISMENETTELYSSA, //Avataan kun nähtävilläolovaihe on päättynyt
    pathname: `/yllapito/projekti/[oid]/hyvaksymispaatos`,
  },
  {
    title: "1. jatkaminen",
    id: "1_jatkopaatos",
    pathname: `/yllapito/projekti/[oid]/jatkaminen1`,
    requiredStatus: Status.JATKOPAATOS_1,
    visible: isJatkopaatos1Visible,
  },
];

function isJatkopaatos1Visible(projekti: ProjektiLisatiedolla | null | undefined): boolean {
  return projekti?.status === Status.JATKOPAATOS_1;
}

export function isVisible(projekti: ProjektiLisatiedolla | null | undefined, route: Route) {
  if (!route.visible) {
    return true;
  }
  return route.visible(projekti);
}

export function statusOrdinal(status: Status): number {
  return Object.values(Status).indexOf(status);
}

export const projektiMeetsMinimumStatus = (projekti: ProjektiLisatiedolla | null | undefined, minimumStatus: Status) =>
  !!projekti?.status && statusOrdinal(projekti.status) >= statusOrdinal(minimumStatus);

interface isAllowedOnRouteResponse {
  isAllowedOnRoute: boolean;
  pathnameForAllowedRoute?: string;
}

export const useIsAllowedOnCurrentProjektiRoute: () => isAllowedOnRouteResponse = () => {
  const { data: projekti } = useProjekti();
  const router = useRouter();

  return useMemo(() => {
    const requiredStatusForCurrentPath = routes.find((route) => route.pathname === router.pathname)?.requiredStatus;
    const isAllowedOnRoute = !requiredStatusForCurrentPath || projektiMeetsMinimumStatus(projekti, requiredStatusForCurrentPath);

    const pathnameForAllowedRoute = isAllowedOnRoute
      ? undefined
      : routes.reduce<string | undefined>((allowedPathname, route) => {
          if (projektiMeetsMinimumStatus(projekti, route.requiredStatus)) {
            allowedPathname = route.pathname;
          }
          return allowedPathname;
        }, undefined);
    return { isAllowedOnRoute, pathnameForAllowedRoute };
  }, [projekti, router.pathname]);
};

export default useIsAllowedOnCurrentProjektiRoute;
