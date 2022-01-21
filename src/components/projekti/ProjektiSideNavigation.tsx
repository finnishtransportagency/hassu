import React, { ReactElement } from "react";
import HassuLink from "../HassuLink";
import styles from "@styles/projekti/ProjektiSideNavigation.module.css";
import classNames from "classnames";
import { useRouter } from "next/router";
import useProjekti from "src/hooks/useProjekti";
import { Status } from "@services/api";

interface Route {
  title: string;
  href?: string;
  disabled?: boolean;
}

export default function ProjektiSideNavigation(): ReactElement {
  const router = useRouter();
  const oidParam = router.query.oid;
  const { data: projekti } = useProjekti(oidParam as string);
  const oid = projekti?.oid;

  const routes: Route[] = [
    {
      title: "Projektin henkilöt",
      href: oid && `/yllapito/projekti/${oid}/henkilot`,
      disabled: !projekti?.tallennettu,
    },
    { title: "Projektin perustiedot", href: oid && `/yllapito/projekti/${oid}`, disabled: !projekti?.tallennettu },
    {
      title: "Aloituskuulutus",
      href: oid && `/yllapito/projekti/${oid}/aloituskuulutus`,
      disabled: projekti?.status === Status.EI_JULKAISTU,
    },
    { title: "Suunnitteluvaihe", href: oid && `/yllapito/projekti/${oid}/suunnittelu`, disabled: true },
    { title: "Nähtävilläolovaihe", href: oid && `/yllapito/projekti/${oid}/nahtavillaolo`, disabled: true },
  ];
  return (
    <div role="navigation" className={styles["side-nav"]}>
      <ul>
        {routes.map((route, index) => (
          <li key={index}>
            <HassuLink
              href={!route.disabled ? route.href : undefined}
              className={classNames(route.disabled && styles.disabled, router.asPath === route.href && styles.selected)}
            >
              {route.title}
            </HassuLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
