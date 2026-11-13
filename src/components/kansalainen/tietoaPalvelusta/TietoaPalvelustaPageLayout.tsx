// Contains code generated or recommended by Amazon Q
import SideNavigation, { Route } from "@components/SideNavigation";
import { Kieli } from "hassu-common/graphql/apiModel";
import useTranslation from "next-translate/useTranslation";
import React, { ReactNode, useMemo } from "react";
import useKansalaiskieli from "../../../hooks/useKansalaiskieli";

type Props = {
  children?: ReactNode;
};

type RouteConfig = Omit<Route, "title" | "children"> & { children?: Omit<Route, "title" | "children">[] };

const routes: RouteConfig[] = [
  { id: "tietoa-palvelusta", pathname: "/tietoa-palvelusta", requireExactMatch: true },
  {
    id: "tietoa-suunnittelusta",
    pathname: "/tietoa-palvelusta/tietoa-suunnittelusta",
    requireExactMatch: true,
    children: [{ id: "toiminnallisen-luokan-muutos", pathname: "/tietoa-palvelusta/tietoa-suunnittelusta/toiminnallisen-luokan-muutos" }],
  },
  { id: "tietoa-suomifi-palvelusta", pathname: "/tietoa-palvelusta/tietoa-suomifi-palvelusta" },
  { id: "yhteystiedot-ja-palaute", pathname: "/tietoa-palvelusta/yhteystiedot-ja-palaute" },
  { id: "saavutettavuus", pathname: "/tietoa-palvelusta/saavutettavuus" },
];

const routesFi: RouteConfig[] = [...routes, { id: "diehtu-planemis", pathname: "/tietoa-palvelusta/diehtu-planemis" }];

export default function TietoaPalvelustaPageLayout({ children }: Props) {
  const { t } = useTranslation("tietoa-palvelusta/navigation");
  const kieli = useKansalaiskieli();
  const routesUsed = kieli === Kieli.SUOMI ? routesFi : routes;
  const routesWithLabel: Route[] = useMemo(
    () =>
      routesUsed.map((route) => ({
        ...route,
        title: t(`polkujen-nimet.${route.id}`),
        children: route.children?.map((child) => ({ ...child, title: t(`polkujen-nimet.${child.id}`) })),
      })),
    [routesUsed, t]
  );
  return (
    <section>
      <div className="flex flex-col md:flex-row gap-8 mb-3">
        <div style={{ minWidth: "345px" }}>
          <SideNavigation routes={routesWithLabel} />
        </div>
        <div className="grow">{children}</div>
      </div>
    </section>
  );
}
