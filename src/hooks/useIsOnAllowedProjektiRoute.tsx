import { Status } from "@services/api";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { ProjektiLisatiedolla, useProjekti } from "./useProjekti";

export interface Route {
  title: string;
  requiredStatus: Status;
  pathname?: string;
}

export const routes: Route[] = [
  {
    title: "Projektin henkilöt",
    requiredStatus: Status.EI_JULKAISTU_PROJEKTIN_HENKILOT,
    pathname: `/yllapito/projekti/[oid]/henkilot`,
  },
  {
    title: "Projektin tiedot",
    requiredStatus: Status.EI_JULKAISTU,
    pathname: `/yllapito/projekti/[oid]`,
  },
  {
    title: "Käsittelyn tila",
    requiredStatus: Status.ALOITUSKUULUTUS, //TODO: avataan nyt samaan aikaan kuin aloituskuulutus lahinna esteettisista syista, ei ole speksattu tarkasti avautumista? Muutettava myohemmin, ettei sotke automaattista ohjausta (ordinal) tietyn vaiheen tayttamisen
    pathname: `/yllapito/projekti/[oid]/kasittelyntila`,
  },
  {
    title: "Aloituskuulutus",
    requiredStatus: Status.ALOITUSKUULUTUS,
    pathname: `/yllapito/projekti/[oid]/aloituskuulutus`,
  },
  {
    title: "Suunnitteluvaihe",
    requiredStatus: Status.SUUNNITTELU,
    pathname: `/yllapito/projekti/[oid]/suunnittelu`,
  },
  {
    title: "Nähtävilläolovaihe",
    requiredStatus: Status.NAHTAVILLAOLO,
    pathname: `/yllapito/projekti/[oid]/nahtavillaolo`,
  },
  {
    title: "Hyväksyminen",
    requiredStatus: Status.HYVAKSYMISMENETTELYSSA, //Avataan kun nähtävilläolovaihe on päättynyt
    pathname: `/yllapito/projekti/[oid]/hyvaksymispaatos`,
  },
];

export function statusOrdinal(status: Status): number {
  return Object.values(Status).indexOf(status);
}

export const projektiHasMinimumStatus = (projekti: ProjektiLisatiedolla | null | undefined, minimumStatus: Status) =>
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
    const isAllowedOnRoute = !requiredStatusForCurrentPath || projektiHasMinimumStatus(projekti, requiredStatusForCurrentPath);

    const pathnameForAllowedRoute = isAllowedOnRoute
      ? undefined
      : routes.reduce<string | undefined>((allowedPathname, route) => {
          if (projektiHasMinimumStatus(projekti, route.requiredStatus)) {
            allowedPathname = route.pathname;
          }
          return allowedPathname;
        }, undefined);
    return { isAllowedOnRoute, pathnameForAllowedRoute };
  }, [projekti, router.pathname]);
};

export default useIsAllowedOnCurrentProjektiRoute;
