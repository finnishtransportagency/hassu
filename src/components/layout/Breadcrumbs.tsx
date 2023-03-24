import React, { ReactElement, useMemo, FunctionComponent } from "react";
import { NextRouter, useRouter } from "next/router";
import Link from "next/link";
import useTranslation from "next-translate/useTranslation";
import { Container, styled } from "@mui/material";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { Kieli, ProjektiJulkinen } from "@services/api";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import { getValidatedKierrosId } from "src/util/getValidatedKierrosId";
import classNames from "classnames";
import { ParsedUrlQueryInput } from "querystring";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import capitalize from "lodash/capitalize";

interface RouteLabels {
  [key: string]: {
    label: string;
    hidden?: boolean | ((nextRouter: NextRouter) => boolean);
    preventTranslation?: boolean;
    disableRoute?: boolean;
    queryParams?: ParsedUrlQueryInput;
  };
}

const Breadcrumbs = () => {
  const router = useRouter();
  const isYllapito = router.asPath.startsWith("/yllapito");
  return isYllapito ? <BreadcrumbsVirkamies /> : <BreadcrumbsJulkinen />;
};

function BreadcrumbsJulkinen(): ReactElement {
  const router = useRouter();
  const { data: projekti } = useProjektiJulkinen();
  const kieli = useKansalaiskieli();

  const routeMapping: RouteLabels = useMemo(() => {
    let routes: RouteLabels = {};
    if (router.isReady) {
      const routeLabels = getJulkinenRouteLabels(projekti, kieli);
      routes = generateRoutes(router, routeLabels, false);
    }
    return routes;
  }, [kieli, projekti, router]);

  return <BreadcrumbComponent isYllapito={false} routeLabels={routeMapping} />;
}

function BreadcrumbsVirkamies(): ReactElement {
  const router = useRouter();
  const { data: projekti } = useProjekti();

  const routeLabels: RouteLabels = useMemo(() => {
    let routes: RouteLabels = {};
    if (router.isReady) {
      const routeLabels = getVirkamiesRouteLabels(router, projekti);
      routes = generateRoutes(router, routeLabels, true);
    }
    return routes;
  }, [projekti, router]);

  return <BreadcrumbComponent isYllapito={true} routeLabels={routeLabels} />;
}

const getVirkamiesRouteLabels: (router: NextRouter, projekti: ProjektiLisatiedolla | null | undefined) => RouteLabels = (
  router,
  projekti
) => {
  const projektiLabel = projekti?.velho.nimi || projekti?.oid || "...";
  const kierrosId = projekti && getValidatedKierrosId(router, projekti);
  const routeLabels: RouteLabels = {
    "/": { label: "Etusivu", hidden: true },
    "/yllapito": {
      label: "Etusivu",
      hidden: (nextRouter) => nextRouter.pathname !== "/yllapito" && !nextRouter.pathname.startsWith("/yllapito/projekti"),
    },
    "/yllapito/perusta": { label: "Projektin perustaminen" },
    "/yllapito/perusta/[oid]": { label: projektiLabel },
    "/yllapito/projekti": { label: "Projektit", hidden: true },
    "/yllapito/projekti/[oid]": { label: projektiLabel, queryParams: { oid: projekti?.oid } },
    "/yllapito/projekti/[oid]/aloituskuulutus": { label: "Aloituskuulutus", queryParams: { oid: projekti?.oid } },
    "/yllapito/projekti/[oid]/kasittelyntila": { label: "Käsittelyn tila", queryParams: { oid: projekti?.oid } },
    "/yllapito/projekti/[oid]/henkilot": { label: "Henkilöt ja käyttöoikeushallinta", queryParams: { oid: projekti?.oid } },
    "/yllapito/projekti/[oid]/suunnittelu": { label: "Suunnittelu ja vuorovaikutus", queryParams: { oid: projekti?.oid } },
    "/yllapito/projekti/[oid]/suunnittelu/vuorovaikuttaminen": {
      label: "Vuorovaikutus",
      disableRoute: true,
      queryParams: { oid: projekti?.oid },
    },
    "/yllapito/projekti/[oid]/suunnittelu/vuorovaikuttaminen/[kierrosId]": {
      label: kierrosId ? `${kierrosId}. vuorovaikuttaminen` : "Vuorovaikuttaminen",
      queryParams: { oid: projekti?.oid, kierrosId },
    },
    "/yllapito/projekti/[oid]/nahtavillaolo": { label: "Nähtävilläolovaihe", queryParams: { oid: projekti?.oid } },
    "/yllapito/projekti/[oid]/nahtavillaolo/aineisto": { label: "Aineisto", queryParams: { oid: projekti?.oid } },
    "/yllapito/projekti/[oid]/nahtavillaolo/kuulutus": { label: "Kuulutus", queryParams: { oid: projekti?.oid } },
    "/yllapito/projekti/[oid]/hyvaksymispaatos": { label: "Hyväksymispäätös", queryParams: { oid: projekti?.oid } },
    "/yllapito/projekti/[oid]/hyvaksymispaatos/aineisto": { label: "Aineisto", queryParams: { oid: projekti?.oid } },
    "/yllapito/projekti/[oid]/hyvaksymispaatos/kuulutus": { label: "Kuulutus", queryParams: { oid: projekti?.oid } },
    "/yllapito/projekti/[oid]/jatkaminen1": { label: "1. jatkaminen", queryParams: { oid: projekti?.oid } },
    "/yllapito/projekti/[oid]/jatkaminen1/aineisto": { label: "Aineisto", queryParams: { oid: projekti?.oid } },
    "/yllapito/projekti/[oid]/jatkaminen1/kuulutus": { label: "Kuulutus", queryParams: { oid: projekti?.oid } },
    "/yllapito/ohjeet": { label: "Ohjeet" },
    "/404": { label: "Virhe" },
  };
  return routeLabels;
};

const getJulkinenRouteLabels: (projekti: ProjektiJulkinen | null | undefined, kieli: Kieli) => RouteLabels = (projekti, kieli) => {
  const projektiLabel =
    (kieli === Kieli.RUOTSI ? projekti?.kielitiedot?.projektinNimiVieraskielella : projekti?.velho.nimi) || projekti?.oid || "...";

  const routeLabels: RouteLabels = {
    "/": {
      label: "etusivu",
      hidden: (nextRouter) =>
        nextRouter.pathname !== "/" && nextRouter.pathname !== "/404" && !nextRouter.pathname.startsWith("/suunnitelma"),
    },
    "/tietoa-palvelusta": { label: "tietoa-palvelusta" },
    "/tietoa-palvelusta/tietoa-suunnittelusta": { label: "tietoa-suunnittelusta" },
    "/tietoa-palvelusta/yhteystiedot-ja-palaute": { label: "yhteystiedot-ja-palaute" },
    "/tietoa-palvelusta/saavutettavuus": { label: "saavutettavuus" },
    "/tietoa-palvelusta/diehtu-planemis": { label: "diehtu-planemis" },
    "/suunnitelma": { label: "suunnitelmat", hidden: true },
    "/suunnitelma/[oid]": { label: capitalize(projektiLabel), preventTranslation: true, queryParams: { oid: projekti?.oid } },
    "/suunnitelma/[oid]/aloituskuulutus": { label: "aloituskuulutus", queryParams: { oid: projekti?.oid } },
    "/suunnitelma/[oid]/suunnittelu": { label: "suunnittelu", queryParams: { oid: projekti?.oid } },
    "/suunnitelma/[oid]/nahtavillaolo": { label: "nahtavillaolo", queryParams: { oid: projekti?.oid } },
    "/suunnitelma/[oid]/hyvaksymismenettelyssa": { label: "hyvaksymismenettelyssa", queryParams: { oid: projekti?.oid } },
    "/suunnitelma/[...all]": { label: "tutki-suunnitelmaa" },
    "/404": { label: "virhe" },
  };
  return routeLabels;
};

const joinPath = (pathArray: string[], sliceIndex: number) => "/" + pathArray.slice(1, sliceIndex + 1).join("/");

const isCurrentRoute = (pathname: string, router: NextRouter) => pathname === router.pathname;

export const generateRoutes = (nextRouter: NextRouter, labels: RouteLabels, isYllapito: boolean): RouteLabels => {
  const pathnameSplitted = nextRouter.pathname.split("/");

  const isOnErrorRouteOnYllapito = isYllapito && nextRouter.pathname === "/404";
  const initialRoutes: RouteLabels = isOnErrorRouteOnYllapito ? { "/yllapito": { label: "Etusivu" } } : {};

  const routes = pathnameSplitted.reduce<RouteLabels>((reducer, pathname, index) => {
    const jointPathname = joinPath(pathnameSplitted, index);
    const hidden = labels[jointPathname]?.hidden;
    const isHidden = typeof hidden === "function" ? hidden?.(nextRouter) : hidden;
    if (!isHidden) {
      const routeLabel = labels[jointPathname];
      const { label = pathname, preventTranslation, disableRoute, queryParams } = routeLabel || {};
      reducer[jointPathname] = { label, preventTranslation, disableRoute, queryParams };
    }
    return reducer;
  }, initialRoutes);

  return routes;
};

const BreadcrumbComponent: FunctionComponent<{ routeLabels: RouteLabels; isYllapito?: boolean }> = ({ routeLabels, isYllapito }) => {
  const { t } = useTranslation("breadcrumbs");
  const router = useRouter();

  return (
    <Container>
      <nav>
        <BreadcrumbList className="vayla-paragraph">
          {Object.entries(routeLabels).map(([pathname, { label, preventTranslation, disableRoute, queryParams }]) => (
            <ListItem key={pathname}>
              {!isCurrentRoute(pathname, router) && !disableRoute ? (
                <Link href={{ pathname, query: queryParams }}>
                  <a>
                    <span>{!isYllapito && !preventTranslation ? t(`polut.${label}`) : label}</span>
                  </a>
                </Link>
              ) : (
                <span className={classNames(isCurrentRoute(pathname, router) && "font-bold")}>
                  {!isYllapito && !preventTranslation ? t(`polut.${label}`) : label}
                </span>
              )}
            </ListItem>
          ))}
        </BreadcrumbList>
      </nav>
    </Container>
  );
};

const BreadcrumbList = styled("ol")(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  marginTop: theme.spacing(7),
  marginBottom: theme.spacing(7),
}));

const ListItem = styled("li")(({ theme }) => ({
  "&:not(:first-of-type):before": { content: '">"', marginRight: "0.25rem" },
  marginRight: theme.spacing(1),
}));

export default Breadcrumbs;
