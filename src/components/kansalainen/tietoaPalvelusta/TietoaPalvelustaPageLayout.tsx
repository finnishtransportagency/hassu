import SideNavigation, { Route } from "@components/SideNavigation";
import useTranslation from "next-translate/useTranslation";
import React, { ReactNode, useMemo } from "react";

type Props = {
  children?: ReactNode;
};

const routes: Omit<Route, "title">[] = [
  { id: "tietoa-palvelusta", pathname: "/tietoa-palvelusta", requireExactMatch: true },
  { id: "tietoa-suunnittelusta", pathname: "/tietoa-palvelusta/tietoa-suunnittelusta" },
  { id: "yhteystiedot-ja-palaute", pathname: "/tietoa-palvelusta/yhteystiedot-ja-palaute" },
  { id: "saavutettavuus", pathname: "/tietoa-palvelusta/saavutettavuus" },
];

export default function TietoaPalvelustaPageLayout({ children }: Props) {
  const { t } = useTranslation("tietoa-palvelusta/navigation");
  const routesWithLabel: Route[] = useMemo(() => routes.map((route) => ({ ...route, title: t(`polkujen-nimet.${route.id}`) })), [t]);
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
