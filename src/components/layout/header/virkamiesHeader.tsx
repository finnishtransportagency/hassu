import React, { ReactElement, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { HeaderProps } from "./header";
import ButtonLink from "@components/button/ButtonLink";

import useTranslation from "next-translate/useTranslation";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { Container } from "@mui/material";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

interface NavigationRoute {
  label: string;
  href: string;
  icon?: IconProp;
  children?: Omit<NavigationRoute, "children">[];
}

export function VirkamiesHeader({ scrolledPastOffset }: HeaderProps): ReactElement {
  const [headerTop, setHeaderTop] = useState<number>(0);
  const headerTopPortion = useRef<HTMLDivElement>(null);
  const logoutHref = process.env.NEXT_PUBLIC_VAYLA_EXTRANET_URL;
  const { t } = useTranslation();

  const { data: kayttaja } = useCurrentUser();

  useEffect(() => {
    const offset = headerTopPortion.current?.clientHeight;
    if (offset) {
      setHeaderTop(offset);
    }
  }, [headerTopPortion]);

  const navigationRoutes: NavigationRoute[] = [
    {
      label: "Etusivu",
      href: "/yllapito",
      icon: "home",
    },
    { label: "Projektin perustaminen", href: "/yllapito/perusta" },
    {
      label: "Ohjeet",
      href: "/yllapito/ohjeet",
    },
  ];

  const kayttajaNimi = kayttaja && kayttaja.etuNimi && kayttaja.sukuNimi && `${kayttaja.sukuNimi}, ${kayttaja.etuNimi}`;

  return (
    <Container
      className="sticky bg-white z-20 w-full transition-all"
      component="header"
      sx={{ top: `${scrolledPastOffset ? -headerTop : 0}px` }}
    >
      <div ref={headerTopPortion}>
        <div className="flex border-b border-gray-light py-5 flex-wrap justify-between gap-x-5 gap-y-5">
          <Link href="/yllapito">
            <a className="flex flex-col uppercase vayla-small-title">
              <span>{t("commonFI:sivustonimi")}</span>
              <span className="font-normal">{t("commonSV:sivustonimi")}</span>
            </a>
          </Link>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <span className="vayla-paragraph">{kayttajaNimi}</span>
            <ButtonLink href={logoutHref} useNextLink={false} endIcon="external-link-alt">
              Poistu Palvelusta
            </ButtonLink>
          </div>
        </div>
      </div>
      <nav className="flex py-6 vayla-navigation uppercase">
        <ul className="flex float-left flex-wrap space-x-20">
          {navigationRoutes.map((route, index) => (
            <HeaderNavigationItem key={index} {...route} />
          ))}
        </ul>
      </nav>
      <div className="pb-2" style={{ background: "linear-gradient(117deg, #009ae0, #49c2f1)" }}></div>
    </Container>
  );
}

function HeaderNavigationItem({ href, label, icon }: NavigationRoute): ReactElement {
  return (
    <li>
      <Link href={href}>
        <a>
          {icon && <FontAwesomeIcon icon={icon} size="lg" className="text-primary-dark mr-10" />}
          {label}
        </a>
      </Link>
    </li>
  );
}

export default VirkamiesHeader;
