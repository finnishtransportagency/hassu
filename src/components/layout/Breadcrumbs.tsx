import React, { ReactElement, useMemo, FC } from "react";
import { NextRouter, useRouter } from "next/router";
import Link from "next/link";
import useTranslation from "next-translate/useTranslation";
import { Container, styled } from "@mui/material";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { ProjektiJulkinen } from "@services/api";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";

interface RouteLabels {
  [key: string]: { label: string; hideWhenNotCurrentRoute?: boolean; preventTranslation?: boolean };
}

const Breadcrumbs = () => {
  const router = useRouter();
  const isYllapito = router.asPath.startsWith("/yllapito");
  return isYllapito ? <BreadcrumbsVirkamies /> : <BreadcrumbsJulkinen />;
};

function BreadcrumbsJulkinen(): ReactElement {
  const router = useRouter();
  const { data: projekti } = useProjektiJulkinen();

  const routeMapping: RouteLabels = useMemo(() => {
    let routes: RouteLabels = {};
    if (router.isReady) {
      const routeLabels = getJulkinenRouteLabels(projekti);
      routes = generateRoutes(router, routeLabels);
    }
    return routes;
  }, [projekti, router]);

  return <BreadcrumbComponent routeLabels={routeMapping} />;
}

function BreadcrumbsVirkamies(): ReactElement {
  const router = useRouter();
  const { data: projekti } = useProjekti();

  const routeLabels: RouteLabels = useMemo(() => {
    let routes: RouteLabels = {};
    if (router.isReady) {
      const routeLabels = getVirkamiesRouteLabels(projekti);
      routes = generateRoutes(router, routeLabels);
    }
    return routes;
  }, [projekti, router]);

  return <BreadcrumbComponent isYllapito routeLabels={routeLabels} />;
}

const getVirkamiesRouteLabels: (projekti: ProjektiLisatiedolla | null | undefined) => RouteLabels = (projekti) => {
  const projektiLabel = projekti?.velho.nimi || projekti?.oid || "...";
  return {
    "/yllapito": { label: "Etusivu", hideWhenNotCurrentRoute: true },
    "/yllapito/perusta": { label: "Projektin perustaminen" },
    "/yllapito/perusta/[oid]": { label: projektiLabel },
    "/yllapito/projekti": { label: "Projektit" },
    "/yllapito/projekti/[oid]": { label: projektiLabel },
    "/yllapito/projekti/[oid]/aloituskuulutus": { label: "Aloituskuulutus" },
    "/yllapito/projekti/[oid]/kasittelyntila": { label: "Käsittelyn tila" },
    "/yllapito/projekti/[oid]/henkilot": { label: "Henkilöt ja käyttöoikeushallinta" },
    "/yllapito/projekti/[oid]/suunnittelu": { label: "Suunnittelu ja vuorovaikutus" },
    "/yllapito/projekti/[oid]/suunnittelu/vuorovaikuttaminen": { label: "Vuorovaikutus" },
    "/yllapito/projekti/[oid]/suunnittelu/vuorovaikuttaminen/[kierrosId]": { label: "Vuorovaikutus" },
    "/yllapito/projekti/[oid]/nahtavillaolo": { label: "Nähtävilläolovaihe" },
    "/yllapito/projekti/[oid]/hyvaksymispaatos": { label: "Hyväksymispäätös" },
    "/yllapito/projekti/[oid]/jatkaminen1": { label: "1. jatkaminen" },
    "/yllapito/ohjeet": { label: "Ohjeet" },
    "/_error": { label: "Virhe" },
  };
};

const getJulkinenRouteLabels: (projekti: ProjektiJulkinen | null | undefined) => RouteLabels = (projekti) => {
  const projektiLabel = projekti?.velho.nimi || projekti?.oid || "...";
  return {
    "/": { label: "etusivu" },
    "/suunnitelma": { label: "suunnitelmat" },
    "/suunnitelma/[oid]": { label: projektiLabel, preventTranslation: true },
    "/suunnitelma/[oid]/aloituskuulutus": { label: "aloituskuulutus" },
    "/suunnitelma/[oid]/suunnittelu": { label: "suunnittelu" },
    "/suunnitelma/[oid]/nahtavillaolo": { label: "nahtavillaolo" },
    "/suunnitelma/[oid]/hyvaksymismenettelyssa": { label: "hyvaksymismenettelyssa" },
    "/suunnitelma/[...all]": { label: "tutki_suunnitelmaa" },
    "/_error": { label: "virhe" },
  };
};

const splitPath = (path: string, pop?: boolean) => {
  const pathSplitted = path.split("/");
  pathSplitted.shift();
  if (pop) {
    pathSplitted.pop();
  }
  return pathSplitted;
};

const joinPath = (pathArray: string[], sliceIndex: number) => "/" + pathArray.slice(0, sliceIndex + 1).join("/");

const isCurrentRoute = (pathname: string, router: NextRouter) => pathname === router.pathname;

export const generateRoutes = (nextRouter: NextRouter, labels: RouteLabels): RouteLabels => {
  // Some breadcrumb require to be hidden when it is not current route
  const isRouteVisible = (pathname: string) => !labels[pathname]?.hideWhenNotCurrentRoute || isCurrentRoute(pathname, nextRouter);

  const pathnameSplitted = splitPath(nextRouter.pathname);

  const routes = pathnameSplitted.reduce<RouteLabels>((reducer, pathname, index) => {
    const jointPathname = joinPath(pathnameSplitted, index);
    if (isRouteVisible(jointPathname)) {
      const routeLabel = labels[jointPathname];
      const label = routeLabel?.label || pathname;
      const preventTranslation = !!routeLabel ? routeLabel.preventTranslation : true;
      reducer[jointPathname] = { label, preventTranslation };
    }
    return reducer;
  }, {});
  return routes;
};

const BreadcrumbComponent: FC<{ routeLabels: RouteLabels; isYllapito?: boolean }> = ({ routeLabels, isYllapito }) => {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Container>
      <nav>
        <ol className="flex flex-wrap vayla-paragraph my-7">
          <li className="mr-1 truncate-ellipsis max-w-xs">
            <Link href={isYllapito ? "/yllapito" : "/"}>{t("common:sivustonimi")}</Link>
          </li>
          {Object.entries(routeLabels).map(([pathname, { label, preventTranslation }]) => (
            <ListItem className="mr-1 truncate-ellipsis max-w-xs" key={pathname}>
              {!isCurrentRoute(pathname, router) ? (
                <Link href={{ pathname, query: router.query }}>
                  <a>
                    <span>{!isYllapito && !preventTranslation ? t(`common:polut.${label}`) : label}</span>
                  </a>
                </Link>
              ) : (
                <span className="font-bold">{!isYllapito && !preventTranslation ? t(`common:polut.${label}`) : label}</span>
              )}
            </ListItem>
          ))}
        </ol>
      </nav>
    </Container>
  );
};

const ListItem = styled("li")({
  "&:before": { content: '">"', marginRight: "0.25rem" },
});

export default Breadcrumbs;
