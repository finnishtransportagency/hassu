import { Status } from "@services/api";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { ProjektiLisatiedolla, useProjekti } from "./useProjekti";
import { isProjektiStatusGreaterOrEqualTo } from "../../common/statusOrder";

type VisibilityHandler = (projekti: ProjektiLisatiedolla | null | undefined) => boolean;

export interface Route {
  title: string;
  requiredStatus: Status;
  pathname?: string;
  visible?: VisibilityHandler | boolean;
  id: string;
  requireExactMatch?: boolean;
}

const PROJEKTIN_HENKILOT_ROUTE: Route = {
  title: "Projektin henkilöt",
  id: "projektin_henkilot",
  requiredStatus: Status.EI_JULKAISTU_PROJEKTIN_HENKILOT,
  pathname: `/yllapito/projekti/[oid]/henkilot`,
};

const PROJEKTIN_TIEDOT_ROUTE: Route = {
  title: "Projektin tiedot",
  id: "projektin_tiedot",
  requiredStatus: Status.EI_JULKAISTU,
  pathname: `/yllapito/projekti/[oid]`,
  requireExactMatch: true,
};

const KASITTELYN_TILA_ROUTE: Route = {
  title: "Käsittelyn tila",
  id: "kasittelyn_tila",
  requiredStatus: Status.ALOITUSKUULUTUS, //TODO: avataan nyt samaan aikaan kuin aloituskuulutus lahinna esteettisista syista, ei ole speksattu tarkasti avautumista? Muutettava myohemmin, ettei sotke automaattista ohjausta (ordinal) tietyn vaiheen tayttamisen
  pathname: `/yllapito/projekti/[oid]/kasittelyntila`,
};

const ALOITUSKUULUTUS_ROUTE: Route = {
  title: "Aloituskuulutus",
  id: "aloituskuulutus",
  requiredStatus: Status.ALOITUSKUULUTUS,
  pathname: `/yllapito/projekti/[oid]/aloituskuulutus`,
};

const SUUNNITTELU_ROUTE: Route = {
  title: "Suunnittelu",
  id: "suunnittelu",
  requiredStatus: Status.SUUNNITTELU,
  pathname: `/yllapito/projekti/[oid]/suunnittelu`,
  visible: (projekti) => !projekti?.vahainenMenettely,
};

const NAHTAVILLAOLO_ROUTE: Route = {
  title: "Nähtävilläolo",
  id: "nahtavillaolovaihe",
  requiredStatus: Status.NAHTAVILLAOLO_AINEISTOT,
  pathname: `/yllapito/projekti/[oid]/nahtavillaolo`,
};

const NAHTAVILLAOLO_AINEISTOT_ROUTE: Route = {
  title: "Nähtävilläolo aineistot",
  id: "nahtavillaolovaihe_aineisto",
  requiredStatus: Status.NAHTAVILLAOLO_AINEISTOT,
  pathname: `/yllapito/projekti/[oid]/nahtavillaolo/aineisto`,
  visible: false,
};

const NAHTAVILLAOLO_KUULUTUS_ROUTE: Route = {
  title: "Nähtävilläolo kuulutus",
  id: "nahtavillaolovaihe_kuulutus",
  requiredStatus: Status.NAHTAVILLAOLO,
  pathname: `/yllapito/projekti/[oid]/nahtavillaolo/kuulutus`,
  visible: false,
};

const HYVAKSYMINEN_ROUTE: Route = {
  title: "Hyväksyminen",
  id: "hyvaksyminen",
  requiredStatus: Status.HYVAKSYMISMENETTELYSSA_AINEISTOT, //Avataan kun nähtävilläolovaihe on päättynyt
  pathname: `/yllapito/projekti/[oid]/hyvaksymispaatos`,
};

const HYVAKSYMINEN_AINEISTO_ROUTE: Route = {
  title: "Hyväksyminen aineisto",
  id: "hyvaksyminen_aineisto",
  requiredStatus: Status.HYVAKSYMISMENETTELYSSA_AINEISTOT, //Avataan kun nähtävilläolovaihe on päättynyt
  pathname: `/yllapito/projekti/[oid]/hyvaksymispaatos/aineisto`,
  visible: false,
};

const HYVAKSYMINEN_KUULUTUS_ROUTE: Route = {
  title: "Hyväksyminen kuulutus",
  id: "hyvaksyminen_kuulutus",
  requiredStatus: Status.HYVAKSYMISMENETTELYSSA, //Avataan kun nähtävilläolovaihe on päättynyt
  pathname: `/yllapito/projekti/[oid]/hyvaksymispaatos/kuulutus`,
  visible: false,
};

const ENSIMMAINEN_JATKAMINEN_ROUTE: Route = {
  title: "1. jatkaminen",
  id: "1_jatkopaatos",
  pathname: `/yllapito/projekti/[oid]/jatkaminen1`,
  requiredStatus: Status.JATKOPAATOS_1_AINEISTOT,
  visible: isJatkopaatos1Visible,
};

const ENSIMMAINEN_JATKAMINEN_AINEISTO_ROUTE: Route = {
  title: "1. jatkaminen aineisto",
  id: "1_jatkopaatos_aineisto",
  pathname: `/yllapito/projekti/[oid]/jatkaminen1/aineisto`,
  requiredStatus: Status.JATKOPAATOS_1_AINEISTOT,
  visible: false,
};

const ENSIMMAINEN_JATKAMINEN_KUULUTUS_ROUTE: Route = {
  title: "1. jatkaminen kuulutus",
  id: "1_jatkopaatos_kuulutus",
  pathname: `/yllapito/projekti/[oid]/jatkaminen1/kuulutus`,
  requiredStatus: Status.JATKOPAATOS_1,
  visible: false,
};

export const routes: Route[] = [
  PROJEKTIN_HENKILOT_ROUTE,
  PROJEKTIN_TIEDOT_ROUTE,
  KASITTELYN_TILA_ROUTE,
  ALOITUSKUULUTUS_ROUTE,
  SUUNNITTELU_ROUTE,
  NAHTAVILLAOLO_ROUTE,
  NAHTAVILLAOLO_AINEISTOT_ROUTE,
  NAHTAVILLAOLO_KUULUTUS_ROUTE,
  HYVAKSYMINEN_ROUTE,
  HYVAKSYMINEN_AINEISTO_ROUTE,
  HYVAKSYMINEN_KUULUTUS_ROUTE,
  ENSIMMAINEN_JATKAMINEN_ROUTE,
  ENSIMMAINEN_JATKAMINEN_AINEISTO_ROUTE,
  ENSIMMAINEN_JATKAMINEN_KUULUTUS_ROUTE,
];

function isJatkopaatos1Visible(projekti: ProjektiLisatiedolla | null | undefined): boolean {
  if (!projekti) {
    return false;
  }
  return isProjektiStatusGreaterOrEqualTo(projekti, Status.JATKOPAATOS_1_AINEISTOT);
}

export function isVisible(projekti: ProjektiLisatiedolla | null | undefined, route: Route) {
  if (typeof route.visible === "undefined") {
    return true;
  } else if (typeof route.visible === "boolean") {
    return route.visible;
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
