import React, { ReactElement, useEffect, useState } from "react";
import { NextRouter, useRouter } from "next/router";
import Link from "next/link";
import useTranslation from "next-translate/useTranslation";
import { Container, styled } from "@mui/material";

export interface RouteLabels {
  [key: string]: { label: string; hideWhenNotCurrentRoute?: boolean; translate?: boolean };
}

export interface RouteMapping {
  [key: string]: { label: string; translate?: boolean; href: string };
}

interface Props {
  routeLabels: RouteLabels;
}

const defaultLabels: RouteLabels = {
  "/": { label: "etusivu", translate: true },
  "/yllapito": { label: "etusivu", hideWhenNotCurrentRoute: true, translate: true },
  "/yllapito/perusta": { label: "projektin_perustaminen", translate: true },
  "/yllapito/perusta/[oid]": { label: "..." },
  "/yllapito/projekti": { label: "projektit", translate: true },
  "/yllapito/projekti/[oid]": { label: "..." },
  "/yllapito/projekti/[oid]/aloituskuulutus": { label: "aloituskuulutus", translate: true },
  "/yllapito/projekti/[oid]/henkilot": { label: "henkilot_ja_kayttooikeushallinta", translate: true },
  "/yllapito/projekti/[oid]/suunnittelu": { label: "suunnittelu_ja_vuorovaikutus", translate: true },
  "/yllapito/projekti/[oid]/nahtavillaolo": { label: "nahtavillaolovaihe", translate: true },
  "/yllapito/ohjeet": { label: "ohjeet", translate: true },
  "/suunnitelma": { label: "suunnitelmat", translate: true },
  "/suunnitelma/[oid]/aloituskuulutus": { label: "aloituskuulutus", translate: true },
  "/suunnitelma/[oid]/suunnittelu": { label: "suunnittelu", translate: true },
  "/suunnitelma/[oid]/nahtavillaolo": { label: "nahtavillaolo", translate: true },
  "/suunnitelma/[oid]/hyvaksymismenettelyssa": { label: "hyvaksymismenettelyssa", translate: true },
  "/suunnitelma/[...all]": { label: "tutki_suunnitelmaa", translate: true },
  "/_error": { label: "virhe", translate: true },
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
  const labels: RouteLabels = { ...defaultLabels, ...routeLabels };
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
      const translate = labels[jointPathname]?.translate || false;
      reducer[jointPathname] = { href, label, translate };
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
          {Object.entries(routeMapping).map(([route, { href, label, translate }]) => (
            <ListItem className="mr-1 truncate-ellipsis max-w-xs" key={route}>
              {!isCurrentRoute(route, router) ? (
                <Link href={href}>
                  <a>
                    <span>{translate ? t(`common:polut.${label}`) : label}</span>
                  </a>
                </Link>
              ) : (
                <span className="font-bold">{translate ? t(`common:polut.${label}`) : label}</span>
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
