import React, { ReactElement, useEffect, useRef, useState } from "react";
import { apiConfig, Kayttaja } from "@services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import style from "@styles/layout/virkamiesHeader.module.css";
import { HeaderProps } from "./header";
import Button from "@components/button/Button";
import { getVaylaUser } from "@services/userService";
import useSWR from "swr";

interface NavigationRoute {
  label: string;
  href: string;
  children?: Omit<NavigationRoute, "children">[];
}

export function VirkamiesHeader({ scrolledPastOffset }: HeaderProps): ReactElement {
  const [headerTop, setHeaderTop] = useState<number>(0);
  const headerTopPortion = useRef<HTMLDivElement>(null);
  const logoutHref = process.env.NEXT_PUBLIC_VAYLA_EXTRANET_URL;

  const { data: kayttaja } = useSWR(apiConfig.nykyinenKayttaja.graphql, vaylaUserLoader);

  useEffect(() => {
    const offset = headerTopPortion.current?.clientHeight;
    if (offset) {
      setHeaderTop(offset);
    }
  }, [headerTopPortion]);

  const navigationRoutes: NavigationRoute[] = [
    {
      label: "Valtion väylien suunnittelu",
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
              <span>Valtion väylien suunnittelu</span>
              <span className="font-normal">Ruotsiksi palvelun nimi</span>
            </a>
          </Link>
          <div className={style.user}>
            <span className="vayla-paragraph">{kayttajaNimi}</span>
            <Button
              primary={true}
              link={logoutHref ? { href: logoutHref, external: true } : undefined}
              endIcon="external-link-alt"
            >
              Poistu Palvelusta
            </Button>
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

export function HeaderNavigationItem({ href, label }: NavigationRoute): ReactElement {
  return (
    <li>
      <Link href={href}>
        <a>{label}</a>
      </Link>
    </li>
  );
}

export default VirkamiesHeader;

async function vaylaUserLoader(_: string): Promise<Kayttaja | undefined> {
  return await getVaylaUser();
}
