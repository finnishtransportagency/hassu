import React, { ReactElement, useMemo, FunctionComponent } from "react";
import { NextRouter, useRouter } from "next/router";
import Link from "next/link";
import useTranslation from "next-translate/useTranslation";
import { Container, styled } from "@mui/material";
import { Kieli, ProjektiJulkinen } from "@services/api";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import classNames from "classnames";
import { ParsedUrlQueryInput } from "querystring";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { useIsYllapito } from "src/hooks/useIsYllapito";

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
  const isYllapito = useIsYllapito();
  return isYllapito ? <div style={{ width: "100%", height: "3em" }}></div> : <BreadcrumbsJulkinen />;
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
    "/tietoa-palvelusta/tietoa-suomifi-palvelusta": { label: "tietoa-suomifi-palvelusta" },
    "/tietoa-palvelusta/yhteystiedot-ja-palaute": { label: "yhteystiedot-ja-palaute" },
    "/tietoa-palvelusta/saavutettavuus": { label: "saavutettavuus" },
    "/tietoa-palvelusta/diehtu-planemis": { label: "diehtu-planemis" },
    "/suunnitelma": { label: "suunnitelmat", hidden: true },
    "/suunnitelma/[oid]": {
      label: projektiLabel,
      preventTranslation: true,
      queryParams: { oid: projekti?.oid },
    },
    "/suunnitelma/[oid]/aloituskuulutus": { label: "aloituskuulutus", hidden: true, queryParams: { oid: projekti?.oid } },
    "/suunnitelma/[oid]/suunnittelu": { label: "suunnittelu", hidden: true, queryParams: { oid: projekti?.oid } },
    "/suunnitelma/[oid]/nahtavillaolo": { label: "nahtavillaolo", hidden: true, queryParams: { oid: projekti?.oid } },
    "/suunnitelma/[oid]/hyvaksymismenettelyssa": { label: "hyvaksymismenettelyssa", hidden: true, queryParams: { oid: projekti?.oid } },
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

  const entries = Object.entries(routeLabels);

  return (
    <Container>
      <nav>
        <BreadcrumbList className="vayla-paragraph">
          {entries.map(([pathname, { label, preventTranslation, disableRoute, queryParams }], index) => (
            <ListItem key={pathname}>
              {!isCurrentRoute(pathname, router) && !disableRoute ? (
                <Link
                  href={{ pathname, query: queryParams }}
                  className={classNames(index == entries.length - 1 && "font-bold")}
                >
                  <span>{!isYllapito && !preventTranslation ? t(`polut.${label}`) : label}</span>
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
