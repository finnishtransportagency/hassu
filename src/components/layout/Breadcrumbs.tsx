import React, { ReactElement, useCallback, useEffect, useState } from "react";
import { breadcrumb } from "@styles/Breadcrumbs.module.css";
import { useRouter } from "next/router";
import Link from "next/link";
import log from "loglevel";

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
  "/suunnitelma": { label: "Suunnitelmat" },
  "/suunnitelma/[...all]": { label: "Tutki suunnitelmaa" },
  "/_error": { label: "Virhe" },
};

export default function Breadcrumbs({ routeLabels }: Props): ReactElement {
  const router = useRouter();
  const [routeMapping, setRouteMapping] = useState<RouteMapping>({});
  const isYllapito = () => typeof router?.pathname === "string" && router.pathname.startsWith("/yllapito");

  const isCurrentRoute = useCallback((route: string) => router?.pathname === route, [router.pathname]);

  useEffect(() => {
    if (router.isReady) {
      const errorRoute = "/_error";
      const isOnErrorRoute = router.pathname === "/_error";
      const pathSplitted = router.asPath.split("/");
      pathSplitted.shift();
      pathSplitted.pop();
      const pathNameSplitted = router.pathname.split("/");
      pathNameSplitted.shift();
      let routes: RouteMapping = {};
      if (isOnErrorRoute) {
        routes[errorRoute] = { ...defaultLabels[errorRoute], href: "/_error" };
      } else {
        routes = pathNameSplitted.reduce<RouteMapping>((reducer, pathname, index) => {
          const pathNameJoined = "/" + pathNameSplitted.slice(0, index + 1).join("/");
          const labels = { ...defaultLabels, ...routeLabels };
          if (!labels[pathNameJoined]?.hideWhenNotCurrentRoute || isCurrentRoute(pathNameJoined)) {
            const href = "/" + pathSplitted.slice(0, index + 1).join("/");
            const label = labels[pathNameJoined]?.label || pathname;
            reducer[pathNameJoined] = { href, label };
          }
          return reducer;
        }, {});
      }
      log.log("routes", routes);
      setRouteMapping(routes);
    }
  }, [router.isReady, router.pathname, isCurrentRoute, routeLabels, router.asPath]);

  return (
    <div className="container mb-4">
      <nav>
        <ol className={`${breadcrumb}`}>
          <li>
            <Link href={isYllapito() ? "/yllapito" : "/"}>Valtion väylien suunnittelu</Link>
          </li>
          {Object.entries(routeMapping).map(([route, { href, label }]) => (
            <li key={route}>
              {!isCurrentRoute(route) ? (
                <Link href={href}>
                  <a>
                    <span>{label}</span>
                  </a>
                </Link>
              ) : (
                <span className="font-bold">{label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
