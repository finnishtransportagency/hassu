// Contains code generated or recommended by Amazon Q
import SideNavigation, { Route } from "@components/SideNavigation";
import useTranslation from "next-translate/useTranslation";
import React, { ReactNode, useMemo } from "react";

type Props = {
  children?: ReactNode;
};

const routes: Omit<Route, "title">[] = [
  { id: "tietoa-suunnittelusta", pathname: "/tietoa-palvelusta/tietoa-suunnittelusta", requireExactMatch: true },
  { id: "toiminnallisen-luokan-muutos", pathname: "/tietoa-palvelusta/tietoa-suunnittelusta/toiminnallisen-luokan-muutos" },
];

export default function TietoaSuunnittelustaPageLayout({ children }: Props) {
  const { t } = useTranslation("tietoa-palvelusta/navigation");
  const routesWithLabel: Route[] = useMemo(
    () => routes.map((route) => ({ ...route, title: t(`polkujen-nimet.${route.id}`) })),
    [t]
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
