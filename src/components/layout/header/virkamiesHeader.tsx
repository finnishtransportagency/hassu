import React, { ReactElement, useEffect, useRef, useState } from "react";
import { apiConfig, NykyinenKayttaja } from "@services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import style from "@styles/layout/virkamiesHeader.module.css";
import { HeaderProps } from "./header";
import { getVaylaUser } from "@services/userService";
import useSWR from "swr";
import ButtonLink from "@components/button/ButtonLink";

import useTranslation from "next-translate/useTranslation";

interface NavigationRoute {
  label: string;
  href: string;
  children?: Omit<NavigationRoute, "children">[];
}

export function VirkamiesHeader({ scrolledPastOffset }: HeaderProps): ReactElement {
  const [headerTop, setHeaderTop] = useState<number>(0);
  const headerTopPortion = useRef<HTMLDivElement>(null);
  const logoutHref = process.env.NEXT_PUBLIC_VAYLA_EXTRANET_URL;
  const { t } = useTranslation();

  const { data: kayttaja } = useSWR(apiConfig.nykyinenKayttaja.graphql, vaylaUserLoader);

  if (kayttaja?.keksit) {
    kayttaja.keksit.forEach((cookie) => {
      document.cookie = cookie;
    });
  }

  useEffect(() => {
    const offset = headerTopPortion.current?.clientHeight;
    if (offset) {
      setHeaderTop(offset);
    }
  }, [headerTopPortion]);

  const navigationRoutes: NavigationRoute[] = [
    {
      label: t("commonFI:sivustonimi"),
      href: "/yllapito",
      children: [{ label: "Projektin perustaminen", href: "/yllapito/perusta" }],
    },
    {
      label: "Ohjeet",
      href: "/yllapito/ohjeet",
      children: [{ label: "Ohjeet", href: "/yllapito/ohjeet" }],
    },
  ];

  const kayttajaNimi = kayttaja && kayttaja.etuNimi && kayttaja.sukuNimi && `${kayttaja.sukuNimi}, ${kayttaja.etuNimi}`;

  return (
    <header className={style.header} style={{ top: `${scrolledPastOffset ? -headerTop : 0}px` }}>
      <div ref={headerTopPortion}>
        <div className={style.topbar}>
          <Link href="/yllapito">
            <a className={style.title}>
              <span>{t("commonFI:sivustonimi")}</span>
              <span className="font-normal">{t("commonSV:sivustonimi")}</span>
            </a>
          </Link>
          <div className={style.user}>
            <span className="vayla-paragraph">{kayttajaNimi}</span>
            <ButtonLink href={logoutHref ? logoutHref : undefined} useNextLink={false} endIcon="external-link-alt">
              Poistu Palvelusta
            </ButtonLink>
          </div>
        </div>
      </div>
      <nav>
        <ul>
          <li>
            <Link href="/yllapito">
              <a className="uppercase">
                <FontAwesomeIcon icon="home" size="lg" className="text-primary-dark" />
              </a>
            </Link>
          </li>
          {navigationRoutes.map(({ href, label }, index) => (
            <HeaderNavigationItem key={index} href={href} label={label} />
          ))}
        </ul>
      </nav>
      <div className={style["bottom-border"]}></div>
    </header>
  );
}

function HeaderNavigationItem({ href, label }: NavigationRoute): ReactElement {
  return (
    <li>
      <Link href={href}>
        <a>{label}</a>
      </Link>
    </li>
  );
}

export default VirkamiesHeader;

async function vaylaUserLoader(_: string): Promise<NykyinenKayttaja | undefined> {
  return await getVaylaUser();
}
