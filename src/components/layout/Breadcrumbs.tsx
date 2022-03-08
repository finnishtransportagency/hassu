import React, { ReactElement, useEffect, useState } from "react";
import { NextRouter, useRouter } from "next/router";
import Link from "next/link";
import useTranslation from "next-translate/useTranslation";
import { Container, styled } from "@mui/material";

export interface RouteLabels {
  [key: string]: { label: string; hideWhenNotCurrentRoute?: boolean };
}

export interface RouteMapping {
  [key: string]: { label: string; href: string };
}

interface Props {
  routeLabels: RouteLabels;
}

const defaultLabels: RouteLabels = {
  "/": { label: "Etusivu" },
  "/yllapito": { label: "Etusivu", hideWhenNotCurrentRoute: true },
  "/yllapito/perusta": { label: "Projektin perustaminen" },
  "/yllapito/perusta/[oid]": { label: "..." },
  "/yllapito/projekti": { label: "Projektit" },
  "/yllapito/projekti/[oid]": { label: "..." },
  "/yllapito/projekti/[oid]/aloituskuulutus": { label: "Aloituskuulutus" },
  "/yllapito/projekti/[oid]/henkilot": { label: "Henkilöt ja käyttöoikeushallinta" },
  "/yllapito/ohjeet": { label: "Ohjeet" },
  "/suunnitelma": { label: "Suunnitelmat" },
  "/suunnitelma/[...all]": { label: "Tutki suunnitelmaa" },
  "/_error": { label: "Virhe" },
};

const ERROR_ROUTE = "/_error";
const ERROR_MAPPING: RouteMapping = { [ERROR_ROUTE]: { ...defaultLabels[ERROR_ROUTE], href: ERROR_ROUTE } };

const isCurrentRoute = (pathname: string, router: NextRouter) => pathname === router.pathname;

const splitPath = (path: string, pop?: boolean) => {
  const pathSplitted = path.split("/");
  pathSplitted.shift();
  if (pop) {
    pathSplitted.pop();
  }
  return pathSplitted;
};

const joinPath = (pathArray: string[], sliceIndex: number) => "/" + pathArray.slice(0, sliceIndex + 1).join("/");

export const generateRoutes = (nextRouter: NextRouter, routeLabels: RouteLabels): RouteMapping => {
  if (nextRouter.pathname === ERROR_ROUTE) {
    return ERROR_MAPPING;
  }
  const labels = { ...defaultLabels, ...routeLabels };
  // Some breadcrumb require to be hidden when it is not current route
  const isRouteVisible = (pathname: string) =>
    !labels[pathname]?.hideWhenNotCurrentRoute || isCurrentRoute(pathname, nextRouter);

  const pathSplitted = splitPath(nextRouter.asPath, true);
  const pathnameSplitted = splitPath(nextRouter.pathname);

  const routes: RouteMapping = pathnameSplitted.reduce<RouteMapping>((reducer, pathname, index) => {
    const jointPathname = joinPath(pathnameSplitted, index);
    if (isRouteVisible(jointPathname)) {
      const href = joinPath(pathSplitted, index);
      const label = labels[jointPathname]?.label || pathname;
      reducer[jointPathname] = { href, label };
    }
    return reducer;
  }, {});
  return routes;
};

export default function Breadcrumbs({ routeLabels }: Props): ReactElement {
  const router = useRouter();
  const [routeMapping, setRouteMapping] = useState<RouteMapping>({});
  const { t } = useTranslation();

  const isYllapito = () => typeof router?.pathname === "string" && router.pathname.startsWith("/yllapito");

  useEffect(() => {
    if (router.isReady) {
      const routes = generateRoutes(router, routeLabels);
      setRouteMapping(routes);
    }
  }, [router, routeLabels]);

  return (
    <Container>
      <nav>
        <ol className="flex flex-wrap vayla-paragraph my-7">
          <li className="mr-1 truncate-ellipsis max-w-xs">
            <Link href={isYllapito() ? "/yllapito" : "/"}>{t("common:sivustonimi")}</Link>
          </li>
          {Object.entries(routeMapping).map(([route, { href, label }]) => (
            <ListItem className="mr-1 truncate-ellipsis max-w-xs" key={route}>
              {!isCurrentRoute(route, router) ? (
                <Link href={href}>
                  <a>
                    <span>{label}</span>
                  </a>
                </Link>
              ) : (
                <span className="font-bold">{label}</span>
              )}
            </ListItem>
          ))}
        </ol>
      </nav>
    </Container>
  );
}

const ListItem = styled("li")({
  "&:before": { content: '">"', marginRight: "0.25rem" },
});
